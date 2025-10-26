"""Schema validation tests for CSV exports."""
import csv
import json
from pathlib import Path
import pytest


EXAMPLES_DIR = Path(__file__).parent.parent / "examples" / "sample_project"


def test_keywords_csv_schema():
    """Validate keywords.csv schema and format."""
    keywords_file = EXAMPLES_DIR / "keywords.csv"

    if not keywords_file.exists():
        pytest.skip("Example keywords.csv not found")

    # Required columns
    required_columns = [
        "keyword", "lemma", "lang", "geo", "intent", "entities",
        "volume", "cpc", "trend_score", "serp_features",
        "difficulty", "difficulty_serp_strength", "difficulty_competition",
        "difficulty_serp_crowding", "difficulty_content_depth",
        "traffic_potential", "opportunity", "topic_id", "page_group_id",
        "is_pillar", "source", "created_at"
    ]

    with open(keywords_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)

        # Check columns
        assert reader.fieldnames is not None, "No header row found"
        for col in required_columns:
            assert col in reader.fieldnames, f"Missing required column: {col}"

        # Validate rows
        row_count = 0
        for row in reader:
            row_count += 1

            # Required fields should not be empty
            assert row['keyword'].strip(), f"Empty keyword in row {row_count}"
            assert row['lang'].strip(), f"Empty lang in row {row_count}"
            assert row['geo'].strip(), f"Empty geo in row {row_count}"

            # JSON fields should be valid JSON
            try:
                entities = json.loads(row['entities'])
                assert isinstance(entities, list), "entities must be JSON array"
            except json.JSONDecodeError as e:
                pytest.fail(f"Invalid JSON in entities field, row {row_count}: {e}")

            try:
                serp_features = json.loads(row['serp_features'])
                assert isinstance(serp_features, list), "serp_features must be JSON array"
            except json.JSONDecodeError as e:
                pytest.fail(f"Invalid JSON in serp_features field, row {row_count}: {e}")

            # Numeric fields should be numeric
            if row['volume']:
                assert row['volume'].replace('-', '').isdigit(), f"volume must be integer in row {row_count}"

            if row['cpc']:
                try:
                    float(row['cpc'])
                except ValueError:
                    pytest.fail(f"cpc must be float in row {row_count}")

            # Boolean field
            assert row['is_pillar'].lower() in ['true', 'false', '0', '1'], \
                f"is_pillar must be boolean in row {row_count}"

        assert row_count > 0, "Keywords CSV is empty"
        print(f"✅ Keywords CSV: {row_count} rows validated")


def test_topics_csv_schema():
    """Validate topics.csv schema and format."""
    topics_file = EXAMPLES_DIR / "topics.csv"

    if not topics_file.exists():
        pytest.skip("Example topics.csv not found")

    required_columns = [
        "topic_id", "label", "pillar_keyword", "cluster_size",
        "avg_difficulty", "total_traffic_potential", "opportunity_sum",
        "created_at"
    ]

    with open(topics_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)

        # Check columns
        assert reader.fieldnames is not None, "No header row found"
        for col in required_columns:
            assert col in reader.fieldnames, f"Missing required column: {col}"

        # Validate rows
        row_count = 0
        for row in reader:
            row_count += 1

            # Required fields
            assert row['topic_id'].strip(), f"Empty topic_id in row {row_count}"
            assert row['label'].strip(), f"Empty label in row {row_count}"
            assert row['pillar_keyword'].strip(), f"Empty pillar_keyword in row {row_count}"

            # Numeric validation
            assert row['topic_id'].isdigit(), f"topic_id must be integer in row {row_count}"
            assert row['cluster_size'].isdigit(), f"cluster_size must be integer in row {row_count}"

            try:
                float(row['avg_difficulty'])
                float(row['total_traffic_potential'])
                float(row['opportunity_sum'])
            except ValueError as e:
                pytest.fail(f"Numeric field validation failed in row {row_count}: {e}")

        assert row_count > 0, "Topics CSV is empty"
        print(f"✅ Topics CSV: {row_count} rows validated")


def test_briefs_csv_schema():
    """Validate briefs.csv schema and format."""
    briefs_file = EXAMPLES_DIR / "briefs.csv"

    if not briefs_file.exists():
        pytest.skip("Example briefs.csv not found")

    required_columns = [
        "page_group_id", "pillar_keyword", "intent_summary", "outline",
        "must_cover_entities", "faqs", "schema_types",
        "internal_links_from", "internal_links_to",
        "recommended_word_range", "serp_features_to_target", "created_at"
    ]

    with open(briefs_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)

        # Check columns
        assert reader.fieldnames is not None, "No header row found"
        for col in required_columns:
            assert col in reader.fieldnames, f"Missing required column: {col}"

        # Validate rows
        row_count = 0
        for row in reader:
            row_count += 1

            # Required fields
            assert row['page_group_id'].strip(), f"Empty page_group_id in row {row_count}"
            assert row['pillar_keyword'].strip(), f"Empty pillar_keyword in row {row_count}"
            assert row['intent_summary'].strip(), f"Empty intent_summary in row {row_count}"

            # JSON fields validation
            json_fields = [
                'outline', 'must_cover_entities', 'faqs',
                'schema_types', 'internal_links_from', 'internal_links_to',
                'serp_features_to_target'
            ]

            for field in json_fields:
                try:
                    data = json.loads(row[field])

                    # Type-specific validation
                    if field == 'outline':
                        assert isinstance(data, dict), f"{field} must be JSON object"
                        assert 'h1' in data, "outline must have h1 field"
                        assert 'h2s' in data, "outline must have h2s field"
                    elif field == 'faqs':
                        assert isinstance(data, list), f"{field} must be JSON array"
                        if data:  # If not empty
                            assert all('question' in item for item in data), \
                                "FAQ items must have question field"
                    else:
                        assert isinstance(data, list), f"{field} must be JSON array"

                except json.JSONDecodeError as e:
                    pytest.fail(f"Invalid JSON in {field} field, row {row_count}: {e}")

            # Word range format validation
            assert '-' in row['recommended_word_range'], \
                f"recommended_word_range must be in format '1500-2000' in row {row_count}"

        assert row_count > 0, "Briefs CSV is empty"
        print(f"✅ Briefs CSV: {row_count} rows validated")


def test_csv_encoding():
    """Validate all CSVs use UTF-8 encoding."""
    csv_files = [
        EXAMPLES_DIR / "keywords.csv",
        EXAMPLES_DIR / "topics.csv",
        EXAMPLES_DIR / "briefs.csv"
    ]

    for csv_file in csv_files:
        if not csv_file.exists():
            continue

        try:
            with open(csv_file, 'r', encoding='utf-8') as f:
                content = f.read()
            assert content, f"{csv_file.name} is empty"
            print(f"✅ {csv_file.name}: UTF-8 encoding validated")
        except UnicodeDecodeError:
            pytest.fail(f"{csv_file.name} is not UTF-8 encoded")


def test_csv_headers():
    """Validate all CSVs have headers."""
    csv_files = [
        EXAMPLES_DIR / "keywords.csv",
        EXAMPLES_DIR / "topics.csv",
        EXAMPLES_DIR / "briefs.csv"
    ]

    for csv_file in csv_files:
        if not csv_file.exists():
            continue

        with open(csv_file, 'r', encoding='utf-8') as f:
            first_line = f.readline().strip()
            assert first_line, f"{csv_file.name} has no header row"
            assert ',' in first_line, f"{csv_file.name} header is not comma-separated"
            print(f"✅ {csv_file.name}: Header row validated")


def test_json_in_csv_format():
    """Validate JSON fields in CSVs are properly escaped."""
    keywords_file = EXAMPLES_DIR / "keywords.csv"

    if not keywords_file.exists():
        pytest.skip("Example keywords.csv not found")

    with open(keywords_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)

        for row in reader:
            # entities field should parse as valid JSON
            entities_raw = row['entities']
            try:
                entities = json.loads(entities_raw)
                assert isinstance(entities, list)

                # Check it's an array of strings
                for entity in entities:
                    assert isinstance(entity, str), \
                        f"Entity must be string, got {type(entity)}"
            except json.JSONDecodeError as e:
                pytest.fail(f"Failed to parse entities JSON: {e}\nRaw: {entities_raw}")


def test_no_missing_critical_data():
    """Validate no critical fields are empty."""
    keywords_file = EXAMPLES_DIR / "keywords.csv"

    if not keywords_file.exists():
        pytest.skip("Example keywords.csv not found")

    critical_fields = ['keyword', 'intent', 'difficulty', 'opportunity', 'topic_id']

    with open(keywords_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)

        for idx, row in enumerate(reader, 1):
            for field in critical_fields:
                assert row[field] and row[field].strip(), \
                    f"Critical field '{field}' is empty in row {idx}"

    print(f"✅ All critical fields populated")


if __name__ == "__main__":
    # Run tests manually
    print("Running schema validation tests...\n")

    test_keywords_csv_schema()
    test_topics_csv_schema()
    test_briefs_csv_schema()
    test_csv_encoding()
    test_csv_headers()
    test_json_in_csv_format()
    test_no_missing_critical_data()

    print("\n✅ All schema validation tests passed!")
