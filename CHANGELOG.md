# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-03-28

### Added

#### AI Metadata Generation
- Generate comprehensive metadata for notes using AI:
  - **Title**: Auto-generated concise, accurate titles (up to 50 characters)
  - **Tags**: 3-8 relevant tags for content classification and retrieval
  - **Category**: Primary category for content organization
  - **Summary**: 100-200 word summary capturing core content
  - **Keywords**: 5-10 SEO-optimized keywords for search discovery
  - **Date**: Automatic timestamp using file creation time
  - **Share**: Optional share flag for content distribution

#### AI Text Optimization
- Full-text optimization for entire documents
- Partial text optimization for selected text segments
- Dual-mode preview: Source code view and rendered Markdown view
- Detailed optimization explanations with improvement suggestions
- Support for both direct application and preview before applying

#### Multi-Platform AI Support
- **Claude (Anthropic)**: Claude Sonnet 4.6, Claude Opus 4.6, Claude Haiku 4.5
- **OpenAI**: GPT-4o, GPT-4o-mini, GPT-4-turbo, GPT-3.5-turbo
- **DeepSeek**: DeepSeek Chat, DeepSeek Coder
- **Tongyi Qwen (Aliyun)**: Qwen Turbo, Qwen Plus, Qwen Max, Qwen Coder Plus
- **Zhipu AI (GLM)**: GLM-4, GLM-4-Flash, GLM-4-Air, GLM-4-Long
- **Xunfei Spark**: Lite, Pro, Pro-128k, Max, 4.0-Ultra

#### Vault Intelligence
- Automatic scanning of existing vault tags and categories
- Smart tag recommendations based on content relevance
- Folder structure integration for category suggestions
- Tag usage frequency analysis for intelligent suggestions
- Frontmatter and inline tag extraction

#### User Interface
- **Metadata Preview Modal**: Interactive editing of AI-generated metadata before application
- **Text Optimization Modal**: Side-by-side comparison with source/preview modes
- **Ribbon Icon**: Quick access button for instant metadata generation
- **Context Menu Integration**:
  - File explorer context menu for single files
  - Editor context menu for current document
  - Folder context menu for batch operations
- **Batch Processing**: Generate metadata for all notes in a folder recursively
- **Status Bar**: Real-time progress indication for AI operations

#### Commands
- `AI Generate Metadata`: Generate metadata for current note
- `AI Generate Metadata (with Preview)`: Generate with preview modal
- `AI Optimize Text`: Optimize current text or selection
- `AI Optimize Text (with Preview)`: Optimize with preview modal

#### Configuration
- Individual API configuration for each AI platform
- Customizable model selection per platform
- Adjustable temperature and max tokens settings
- Custom base URL support for API proxies
- Toggle ribbon icon visibility
- Toggle context menu items
- Toggle preview mode for metadata generation
- Toggle preview mode for text optimization
- Maximum tags limit configuration
- Folder structure inclusion option

### Changed
- Migrated from `fetch` API to Obsidian's `requestUrl` for better CORS handling
- Refactored UI styles from inline styles to CSS classes
- Improved TypeScript type safety throughout codebase

### Fixed
- Fixed type safety issues by replacing `any` types with proper TypeScript types
- Fixed async callback handling in modal dialogs
- Removed debug console.log statements from production code
