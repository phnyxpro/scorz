# Walkthrough Auto-Update System

This system automatically generates and updates comprehensive walkthrough documentation from the structured help articles in the Scorz platform.

## Overview

The walkthrough auto-update system maintains synchronization between:
- **Source**: Structured help articles in `src/content/help-articles.ts`
- **Output**: Comprehensive markdown walkthroughs in `content/walkthroughs/`

## How It Works

1. **Data Source**: Help articles are organized by category (judge, organiser, tabulator, contestant)
2. **Auto-Generation**: Script processes articles and generates complete markdown documents
3. **Content Structure**: Each walkthrough includes:
   - Title and description
   - Table of contents
   - Sectioned content from help articles
   - Footer with help resources and last updated date

## Usage

### Update All Walkthroughs
```bash
npm run update-walkthroughs
```

This regenerates all walkthrough markdown files from the current help articles.

### Validate Walkthrough Files
```bash
npm run validate-walkthroughs
```

Checks that all required walkthrough files exist and help articles are available.

### Manual Script Execution
```bash
# Update walkthroughs
node scripts/update-walkthroughs.js

# Validate walkthroughs
node scripts/update-walkthroughs.js validate
```

## File Structure

```
content/walkthroughs/
├── JUDGE_WALKTHROUGH.md
├── ORGANISER_WALKTHROUGH.md
├── TABULATOR_WALKTHROUGH.md
└── CONTESTANT_WALKTHROUGH.md

scripts/
├── update-walkthroughs.js    # Main script
└── help-articles.js          # Compiled help articles

src/lib/
└── walkthrough-generator.ts  # TypeScript utility functions
```

## Integration Points

### Build Process
The system can be integrated into the build process to automatically update walkthroughs when help articles change.

### CI/CD Pipeline
Add walkthrough validation to CI/CD to ensure documentation stays current.

### Development Workflow
- Update help articles in `src/content/help-articles.ts`
- Run `npm run update-walkthroughs` to regenerate documentation
- Commit both the source changes and updated walkthroughs

## Benefits

- **Consistency**: Ensures walkthroughs match in-app help content
- **Maintenance**: Single source of truth for documentation
- **Automation**: Reduces manual documentation maintenance
- **Quality**: Structured generation prevents formatting errors
- **Scalability**: Easy to add new walkthrough categories

## Technical Details

### Dependencies
- TypeScript compiler for help articles compilation
- Node.js ES modules for script execution
- File system operations for reading/writing markdown files

### Script Flow
1. Import compiled help articles
2. Group articles by category/role
3. Generate markdown content with proper formatting
4. Write files to `content/walkthroughs/` directory
5. Report success/failure status

### Error Handling
- Validates file existence and accessibility
- Reports missing help articles or walkthrough files
- Provides clear error messages for troubleshooting

## Future Enhancements

- **Watch Mode**: Automatically update when help articles change
- **Version Control**: Track walkthrough changes with git
- **Content Validation**: Check for broken links and formatting issues
- **Multi-format Output**: Generate PDF/HTML versions
- **Internationalization**: Support multiple languages