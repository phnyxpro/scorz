#!/usr/bin/env node

/**
 * Walkthrough Auto-Update Script
 *
 * This script automatically updates walkthrough markdown files from the help articles data.
 * Run this script whenever help articles are updated to keep walkthroughs in sync.
 *
 * Usage:
 *   npm run update-walkthroughs
 *   node scripts/update-walkthroughs.js
 */

import { writeFileSync, mkdirSync, accessSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { helpArticles } from './help-articles.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = process.cwd(); // Use current working directory instead of script location

/**
 * Auto-update walkthrough documents from help articles
 */
function updateWalkthroughs() {
  console.log('🔄 Starting walkthrough auto-update process...');

  // Group articles by category
  const articlesByCategory = helpArticles.reduce((acc, article) => {
    if (!acc[article.categorySlug]) {
      acc[article.categorySlug] = [];
    }
    acc[article.categorySlug].push(article);
    return acc;
  }, {});

  // Define walkthrough configurations for each role
  const walkthroughConfigs = {
    judge: {
      title: 'Judge & Chief Judge Walkthrough Guide',
      description: 'Complete guide for judges and chief judges covering scoring, certification, and competition management.',
      sections: []
    },
    organiser: {
      title: 'Organiser Walkthrough Guide',
      description: 'Comprehensive guide for competition organizers covering event planning, staff management, and execution.',
      sections: []
    },
    tabulator: {
      title: 'Tabulator Walkthrough Guide',
      description: 'Complete guide for tabulators covering timing, score verification, penalties, and certification.',
      sections: []
    },
    contestant: {
      title: 'Contestant Walkthrough Guide',
      description: 'Step-by-step guide for contestants covering registration, profile building, competition participation, and feedback.',
      sections: []
    }
  };

  // Generate walkthrough content for each category
  Object.entries(articlesByCategory).forEach(([categorySlug, articles]) => {
    if (!walkthroughConfigs[categorySlug]) return;

    const config = walkthroughConfigs[categorySlug];
    const sortedArticles = articles.sort((a, b) => a.order - b.order);

    // Generate table of contents
    const tocItems = sortedArticles.map((article, index) =>
      `${index + 1}. [${article.title}](#${article.slug.replace(/-/g, '')})`
    ).join('\n');

    // Generate main content sections
    const sections = sortedArticles.map(article => ({
      title: article.title,
      content: article.content,
      slug: article.slug
    }));

    config.sections = sections;

    // Generate full markdown content
    const markdownContent = generateWalkthroughMarkdown(config, tocItems);

    // Write to file
    const fileName = `${categorySlug.toUpperCase()}_WALKTHROUGH.md`;
    const filePath = join(projectRoot, 'content', 'walkthroughs', fileName);

    // Ensure directory exists
    mkdirSync(dirname(filePath), { recursive: true });

    writeFileSync(filePath, markdownContent, 'utf-8');
    console.log(`✅ Updated ${fileName}`);
  });

  console.log('🎉 Walkthrough auto-update completed successfully!');
}

/**
 * Generate markdown content for a walkthrough
 */
function generateWalkthroughMarkdown(config, tocItems) {
  const header = `# ${config.title}

${config.description}

---

## Table of Contents

${tocItems}

---

`;

  const sections = config.sections.map(section => {
    const sectionHeader = `## ${section.title}

`;
    return sectionHeader + section.content.trim();
  }).join('\n\n---\n\n');

  const footer = `

---

## Need Help?

- **In-App Help**: Access detailed guides within the Scorz platform
- **Support**: Contact your competition organizer or Scorz support
- **Updates**: This guide is automatically updated when new features are added

---

*Last updated: ${new Date().toLocaleDateString()}*
`;

  return header + sections + footer;
}

/**
 * Validate walkthrough content against help articles
 */
function validateWalkthroughs() {
  const issues = [];

  // Check if walkthrough files exist
  const requiredFiles = ['JUDGE_WALKTHROUGH.md', 'ORGANISER_WALKTHROUGH.md', 'TABULATOR_WALKTHROUGH.md', 'CONTESTANT_WALKTHROUGH.md'];

  requiredFiles.forEach(fileName => {
    const filePath = join(projectRoot, 'content', 'walkthroughs', fileName);
    try {
      accessSync(filePath);
    } catch {
      issues.push(`Missing walkthrough file: ${fileName}`);
    }
  });

  // Check if help articles have corresponding walkthrough content
  const articlesByCategory = helpArticles.reduce((acc, article) => {
    if (!acc[article.categorySlug]) {
      acc[article.categorySlug] = [];
    }
    acc[article.categorySlug].push(article);
    return acc;
  }, {});

  Object.entries(articlesByCategory).forEach(([categorySlug, articles]) => {
    if (!['judge', 'organiser', 'tabulator', 'contestant'].includes(categorySlug)) return;

    if (articles.length === 0) {
      issues.push(`No help articles found for category: ${categorySlug}`);
    }
  });

  return {
    valid: issues.length === 0,
    issues
  };
}

// Main execution
const command = process.argv[2];

if (command === 'validate') {
  const result = validateWalkthroughs();
  console.log(result.valid ? '✅ All walkthroughs are valid' : '❌ Issues found:');
  result.issues.forEach(issue => console.log('  -', issue));
  process.exit(result.valid ? 0 : 1);
} else {
  // Default: update walkthroughs
  updateWalkthroughs();
}