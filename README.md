# SmartScribe for Obsidian

An Obsidian plugin that uses AI to intelligently generate titles, tags, categories, and summaries for your notes, as well as optimize your writing. Supports multiple AI platforms.

> **Plugin ID**: `smartscribe`

## Supported AI Platforms

| Platform | Name | Default Model |
|----------|------|---------------|
| Claude | Anthropic Claude | claude-sonnet-4-6 |
| OpenAI | OpenAI GPT | gpt-4o |
| DeepSeek | DeepSeek | deepseek-chat |
| Qwen | Alibaba Tongyi Qwen | qwen-plus |
| Zhipu AI | Zhipu GLM | glm-4 |
| Spark | Xunfei Spark | pro |

## Features

### AI Metadata Generation
- 🤖 **Multi-Platform Support**: Supports 6 mainstream AI platforms, freely switchable
- 🏷️ **Tag Reuse**: Prioritizes existing tags in your Vault for consistency
- 📂 **Category Suggestions**: Supports category recommendations based on folder structure
- ✏️ **Preview & Edit**: Preview and edit metadata before applying
- 🖱️ **Context Menu**: Right-click menu in file explorer and editor

### AI Text Optimization
- ✨ **Smart Writing Assistant**: Optimize selected text or entire document with one click
- 📝 **Smart Improvements**: Enhances expression, structure, grammar, and readability
- 🎯 **Dual-Panel Preview**: Left panel shows optimized text (editable), right panel shows improvement suggestions
- 🔄 **Direct Apply**: Apply optimizations directly or preview first based on settings

### Flexible Configuration
- ⚙️ **Independent Configuration**: Independent configuration for each platform (API Key, model, parameters)
- 🔧 **Granular Control**: Separate settings for metadata generation and text optimization features

## Installation

### Manual Installation

1. Download the latest release from GitHub
2. Extract the files to your Vault's `.obsidian/plugins/smartscribe/` folder
3. Enable the plugin in Obsidian settings

## Configuration

1. Open plugin settings
2. Select your preferred **AI Platform**
3. Configure the **API Key** for the selected platform
4. Choose the **Model** to use
5. Adjust parameters like Temperature and Max Tokens as needed
6. Configure feature options (max tags, folder structure, preview settings, etc.)

### API Key Sources

- **Claude**: https://console.anthropic.com/
- **OpenAI**: https://platform.openai.com/
- **DeepSeek**: https://platform.deepseek.com/
- **Qwen**: https://dashscope.aliyun.com/
- **Zhipu AI**: https://open.bigmodel.cn/
- **Spark**: https://xinghuo.xfyun.cn/

## Usage

### Metadata Generation

#### Command Palette

- **Generate AI Metadata for Current Note**: Generate and apply metadata directly
- **Generate AI Metadata for Current Note (with Preview)**: Show preview after generation, edit before applying

#### Context Menu

Right-click on a Markdown file in the file list and select "AI Generate Metadata"

#### Editor Menu

Right-click in the editor to access the AI metadata generation option

### Text Optimization

#### Command Palette

- **AI Optimize Text**: Optimize selected text (or full document if no selection)
- **AI Optimize Text (with Preview)**: Always show preview before applying

#### Context Menu

Right-click in the editor and select "AI Optimize Text" to optimize selected text or the entire document

#### How It Works

1. **Select Text**: Select text in the editor, or leave unselected to optimize the entire document
2. **Trigger Optimization**: Use command palette or right-click menu
3. **Preview (Optional)**: If preview is enabled, a dual-panel modal appears:
   - **Left Panel**: Optimized text (editable, supports formatting)
   - **Right Panel**: Improvement suggestions (bullet points)
4. **Apply**: Click "Apply" to replace the original text with the optimized version

## Generated Metadata Format

```yaml
---
date: 2024-01-15 10:30:00
title: Generated Title
tags:
  - tag1
  - tag2
  - tag3
category: Category Name
keywords:
  - keyword1
  - keyword2
summary: Article summary...
share: true
---
```

## How It Works

### Metadata Generation
1. **Analysis Phase**: The plugin collects existing tags from your Vault using Obsidian's MetadataCache API
2. **Generation Phase**: Calls the selected AI platform API to analyze article content, passing existing tags and categories as references
3. **Application Phase**: Writes the generated metadata to the file's YAML frontmatter

### Text Optimization
1. **Content Capture**: Captures selected text or the entire document content
2. **AI Processing**: Sends content to AI with optimization instructions
3. **Result Parsing**: Separates optimized text from improvement suggestions
4. **Preview/Application**: Shows preview (if enabled) or directly applies the optimized text

## Settings

### Model Settings
- **AI Platform**: Choose from 6 supported platforms
- **API Key**: Your API key for the selected platform
- **Model**: Select the model to use
- **Base URL**: Optional, for custom API endpoints or proxies
- **Temperature**: Generation randomness (0-2, lower is more deterministic)
- **Max Tokens**: Maximum tokens to generate

### Metadata Generation Settings
- **Max Tags**: Maximum number of existing tags to reference (1-10)
- **Include Folder Structure**: Use file location as category suggestions
- **Show Context Menu**: Show metadata option in right-click menus
- **Show Preview Before Generation**: Show preview window before generating metadata

### Text Optimization Settings
- **Show Optimize Menu**: Show "AI Optimize Text" in editor right-click menu
- **Show Preview Before Optimization**: Show preview window before optimizing text

## Notes

- Requires a valid API Key, configured separately for each platform
- API calls will incur costs, please monitor your usage
- Recommended to backup important files before generation
- Adjust the Temperature parameter to control creativity of results
- Text optimization works best on substantial text (more than a few sentences)

## Development

```bash
# Install dependencies
npm install

# Development mode (auto-build)
npm run dev

# Production build
npm run build
```

## Support

If you encounter any issues or have feature requests, please submit an issue on GitHub.

## License

MIT
