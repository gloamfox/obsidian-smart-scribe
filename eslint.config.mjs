import { defineConfig } from "eslint/config";
import obsidianmd from "eslint-plugin-obsidianmd";

export default defineConfig([
	...obsidianmd.configs.recommended,
	{
		languageOptions: {
			parserOptions: {
				projectService: {
					allowDefaultProject: ["eslint.config.*", "esbuild.config.mjs", "version-bump.mjs"],
				},
			},
		},
		rules: {
			// 插件 minAppVersion 为 1.12.7，低于声明式设置 API 所需的 1.13.0，
			// 命令式 display()/Setting API 才是正确实现，故关闭该建议规则
			"obsidianmd/settings-tab/prefer-setting-definitions": "off",
		},
	},
	{
		// 构建/发布脚本运行于 Node.js 环境，不随插件发布到移动端
		files: ["esbuild.config.mjs", "version-bump.mjs"],
		languageOptions: {
			globals: {
				process: "readonly",
				console: "readonly",
			},
		},
		rules: {
			"obsidianmd/no-nodejs-modules": "off",
		},
	},
]);