/**
 * Proposal Diff Generator
 * Creates visual diffs for proposal before/after values
 */

import { diffWords, diffChars, diffLines } from 'diff';

export class ProposalDiffGenerator {
  /**
   * Generate HTML diff
   */
  generateDiff(before, after, type = 'auto') {
    // Auto-detect best diff method
    if (type === 'auto') {
      if (this.isMultiline(before) || this.isMultiline(after)) {
        type = 'lines';
      } else if (before.length > 100 || after.length > 100) {
        type = 'words';
      } else {
        type = 'chars';
      }
    }

    let diff;
    switch (type) {
      case 'lines':
        diff = diffLines(before, after);
        break;
      case 'words':
        diff = diffWords(before, after);
        break;
      case 'chars':
        diff = diffChars(before, after);
        break;
      default:
        diff = diffWords(before, after);
    }

    return this.diffToHTML(diff);
  }

  /**
   * Convert diff to HTML
   */
  diffToHTML(diff) {
    const html = diff.map(part => {
      const escapedValue = this.escapeHTML(part.value);
      
      if (part.added) {
        return `<span class="diff-added" style="background-color: #d4edda; color: #155724;">${escapedValue}</span>`;
      } else if (part.removed) {
        return `<span class="diff-removed" style="background-color: #f8d7da; color: #721c24; text-decoration: line-through;">${escapedValue}</span>`;
      } else {
        return `<span class="diff-unchanged" style="color: #6c757d;">${escapedValue}</span>`;
      }
    }).join('');

    return html;
  }

  /**
   * Generate side-by-side diff
   */
  generateSideBySideDiff(before, after) {
    const diff = diffLines(before, after);
    
    const leftLines = [];
    const rightLines = [];

    diff.forEach(part => {
      const lines = part.value.split('\n');
      lines.forEach((line, i) => {
        // Skip last empty line
        if (i === lines.length - 1 && line === '') return;

        if (part.removed) {
          leftLines.push({
            content: line,
            type: 'removed'
          });
        } else if (part.added) {
          rightLines.push({
            content: line,
            type: 'added'
          });
        } else {
          leftLines.push({
            content: line,
            type: 'unchanged'
          });
          rightLines.push({
            content: line,
            type: 'unchanged'
          });
        }
      });
    });

    return { leftLines, rightLines };
  }

  /**
   * Generate diff statistics
   */
  generateDiffStats(before, after) {
    const diff = diffWords(before, after);
    
    let added = 0;
    let removed = 0;
    let unchanged = 0;

    diff.forEach(part => {
      const wordCount = part.value.split(/\s+/).filter(w => w.length > 0).length;
      
      if (part.added) {
        added += wordCount;
      } else if (part.removed) {
        removed += wordCount;
      } else {
        unchanged += wordCount;
      }
    });

    const total = added + removed + unchanged;
    const changePercent = total > 0 ? ((added + removed) / total * 100).toFixed(1) : 0;

    return {
      added,
      removed,
      unchanged,
      total,
      changePercent: parseFloat(changePercent)
    };
  }

  /**
   * Check if text is multiline
   */
  isMultiline(text) {
    return text.includes('\n') || text.length > 200;
  }

  /**
   * Escape HTML
   */
  escapeHTML(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Generate compact summary
   */
  generateSummary(before, after) {
    const stats = this.generateDiffStats(before, after);
    
    if (stats.changePercent < 10) {
      return 'Minor changes';
    } else if (stats.changePercent < 50) {
      return 'Moderate changes';
    } else {
      return 'Major changes';
    }
  }
}

export const diffGenerator = new ProposalDiffGenerator();
export default diffGenerator;
