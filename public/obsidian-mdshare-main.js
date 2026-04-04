"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => MdsharePlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian = require("obsidian");
var API_URL = "https://mdshare.live/api/documents";
var MdsharePlugin = class extends import_obsidian.Plugin {
  async onload() {
    this.registerEvent(
      this.app.workspace.on("file-menu", (menu, file) => {
        if (file instanceof import_obsidian.TFile && file.extension === "md") {
          menu.addItem((item) => {
            item.setTitle("Share on mdshare").setIcon("share").onClick(() => this.shareFile(file));
          });
        }
      })
    );
    this.registerEvent(
      this.app.workspace.on("editor-menu", (menu, editor) => {
        if (editor.getSelection()) {
          menu.addItem((item) => {
            item.setTitle("Share selection on mdshare").setIcon("share").onClick(() => this.uploadContent(editor.getSelection()));
          });
        }
      })
    );
    this.addCommand({
      id: "share-file",
      name: "Share current file on mdshare",
      checkCallback: (checking) => {
        const file = this.app.workspace.getActiveFile();
        if (file && file.extension === "md") {
          if (!checking) this.shareFile(file);
          return true;
        }
        return false;
      }
    });
  }
  async shareFile(file) {
    const content = await this.app.vault.read(file);
    if (!content.trim()) {
      new import_obsidian.Notice("File is empty.");
      return;
    }
    await this.uploadContent(content);
  }
  async uploadContent(content) {
    try {
      const res = await (0, import_obsidian.requestUrl)({
        url: API_URL,
        method: "POST",
        contentType: "text/plain",
        body: content
      });
      const { admin_url } = res.json;
      await navigator.clipboard.writeText(admin_url);
      new import_obsidian.Notice("Shared! Admin URL copied to clipboard.");
    } catch (e) {
      new import_obsidian.Notice("mdshare: " + e.message);
    }
  }
};
