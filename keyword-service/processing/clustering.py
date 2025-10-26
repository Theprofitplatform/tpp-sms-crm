"""Keyword clustering using embeddings and token overlap."""
import numpy as np
from typing import List, Dict, Tuple, Set
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.cluster import AgglomerativeClustering
import networkx as nx
from config import settings


class KeywordClusterer:
    """Cluster keywords into topics and page groups."""
    
    def __init__(self, model_name: str = 'all-MiniLM-L6-v2'):
        """Initialize with sentence transformer model."""
        print(f"Loading embedding model: {model_name}...")
        self.model = SentenceTransformer(model_name)
        self.embeddings_cache = {}
    
    def get_embeddings(self, keywords: List[str]) -> np.ndarray:
        """Get embeddings for keywords (with caching)."""
        uncached = []
        uncached_indices = []
        
        for i, kw in enumerate(keywords):
            if kw not in self.embeddings_cache:
                uncached.append(kw)
                uncached_indices.append(i)
        
        # Generate embeddings for uncached keywords
        if uncached:
            new_embeddings = self.model.encode(uncached, show_progress_bar=False)
            for kw, emb in zip(uncached, new_embeddings):
                self.embeddings_cache[kw] = emb
        
        # Retrieve all embeddings
        embeddings = np.array([self.embeddings_cache[kw] for kw in keywords])
        return embeddings
    
    def calculate_similarity_matrix(self, keywords: List[str]) -> np.ndarray:
        """Calculate cosine similarity matrix."""
        embeddings = self.get_embeddings(keywords)
        similarity = cosine_similarity(embeddings)
        return similarity
    
    def cluster_topics(self, 
                      keywords: List[str],
                      threshold: float = None) -> List[List[int]]:
        """
        Cluster keywords into topics using community detection.
        
        Returns: List of clusters, where each cluster is a list of keyword indices.
        """
        if threshold is None:
            threshold = settings.topic_cluster_threshold
        
        if len(keywords) < 2:
            return [[0]] if keywords else []
        
        # Get similarity matrix
        similarity = self.calculate_similarity_matrix(keywords)
        
        # Convert to distance
        distance = 1 - similarity
        
        # Agglomerative clustering
        clustering = AgglomerativeClustering(
            n_clusters=None,
            distance_threshold=1-threshold,
            metric='precomputed',
            linkage='average'
        )
        
        labels = clustering.fit_predict(distance)
        
        # Group by cluster label
        clusters = {}
        for idx, label in enumerate(labels):
            if label not in clusters:
                clusters[label] = []
            clusters[label].append(idx)
        
        return list(clusters.values())
    
    def cluster_pages(self,
                     keywords: List[str],
                     threshold: float = None) -> List[List[int]]:
        """
        Cluster keywords into page groups (tighter clustering).
        Uses higher threshold and token overlap.
        """
        if threshold is None:
            threshold = settings.page_group_threshold
        
        if len(keywords) < 2:
            return [[0]] if keywords else []
        
        # Get similarity matrix
        similarity = self.calculate_similarity_matrix(keywords)
        
        # Also calculate token overlap
        token_overlap = self._calculate_token_overlap_matrix(keywords)
        
        # Combine: average of embedding similarity and token overlap
        combined_similarity = (similarity + token_overlap) / 2.0
        
        # Convert to distance
        distance = 1 - combined_similarity
        
        # Agglomerative clustering with higher threshold
        clustering = AgglomerativeClustering(
            n_clusters=None,
            distance_threshold=1-threshold,
            metric='precomputed',
            linkage='average'
        )
        
        labels = clustering.fit_predict(distance)
        
        # Group by cluster label
        clusters = {}
        for idx, label in enumerate(labels):
            if label not in clusters:
                clusters[label] = []
            clusters[label].append(idx)
        
        return list(clusters.values())
    
    def _calculate_token_overlap_matrix(self, keywords: List[str]) -> np.ndarray:
        """Calculate Jaccard similarity matrix based on tokens."""
        n = len(keywords)
        matrix = np.zeros((n, n))
        
        # Tokenize all keywords
        token_sets = [set(kw.lower().split()) for kw in keywords]
        
        for i in range(n):
            for j in range(i, n):
                if i == j:
                    matrix[i][j] = 1.0
                else:
                    intersection = len(token_sets[i] & token_sets[j])
                    union = len(token_sets[i] | token_sets[j])
                    jaccard = intersection / union if union > 0 else 0.0
                    matrix[i][j] = jaccard
                    matrix[j][i] = jaccard
        
        return matrix
    
    def select_pillar_keyword(self,
                            keywords: List[str],
                            keyword_data: List[Dict]) -> int:
        """
        Select pillar keyword from cluster.
        Based on highest opportunity score.
        """
        max_opportunity = -1
        pillar_idx = 0
        
        for i, kw in enumerate(keywords):
            data = keyword_data[i]
            opportunity = data.get('opportunity', 0)
            
            if opportunity > max_opportunity:
                max_opportunity = opportunity
                pillar_idx = i
        
        return pillar_idx
    
    def build_hub_cluster_graph(self,
                               topic_keywords: List[str],
                               page_groups: List[List[int]],
                               pillar_idx: int,
                               sibling_threshold: float = None) -> Dict:
        """
        Build hub-cluster graph structure.
        
        - Hub = pillar page
        - Spokes = support pages
        - Siblings = related support pages
        """
        if sibling_threshold is None:
            sibling_threshold = settings.sibling_link_threshold
        
        # Get similarity matrix for sibling detection
        similarity = self.calculate_similarity_matrix(topic_keywords)
        
        # Build graph
        G = nx.DiGraph()
        
        # Add hub node
        hub_keyword = topic_keywords[pillar_idx]
        G.add_node(0, keyword=hub_keyword, type='hub')
        
        # Add spoke nodes and hub->spoke edges
        spoke_nodes = []
        for group_idx, page_group in enumerate(page_groups):
            if pillar_idx in page_group:
                continue  # Skip hub's own group
            
            # Use first keyword in group as representative
            representative_idx = page_group[0]
            spoke_keyword = topic_keywords[representative_idx]
            
            node_id = group_idx + 1
            G.add_node(node_id, keyword=spoke_keyword, type='spoke')
            G.add_edge(0, node_id, type='hub_to_spoke')
            
            spoke_nodes.append((node_id, representative_idx))
        
        # Add sibling edges (spoke to spoke)
        for i, (node_i, idx_i) in enumerate(spoke_nodes):
            for j, (node_j, idx_j) in enumerate(spoke_nodes[i+1:], start=i+1):
                sim = similarity[idx_i][idx_j]
                if sim >= sibling_threshold:
                    G.add_edge(node_i, node_j, type='sibling')
                    G.add_edge(node_j, node_i, type='sibling')
        
        # Convert to dict format
        graph_data = {
            'nodes': [
                {
                    'id': node_id,
                    'keyword': data['keyword'],
                    'type': data['type']
                }
                for node_id, data in G.nodes(data=True)
            ],
            'edges': [
                {
                    'source': source,
                    'target': target,
                    'type': data['type']
                }
                for source, target, data in G.edges(data=True)
            ]
        }
        
        return graph_data
