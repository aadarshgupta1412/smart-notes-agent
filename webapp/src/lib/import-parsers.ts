/**
 * Parsers for various bookmark export formats.
 */

export interface ParsedBookmark {
  url: string;
  title?: string;
  folder?: string;
  tags?: string[];
}

/**
 * Parse Chrome/Firefox HTML bookmark export.
 * The format uses nested <DL> lists with <DT> items.
 */
export function parseBookmarkHtml(html: string): ParsedBookmark[] {
  const bookmarks: ParsedBookmark[] = [];
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  function traverse(element: Element, currentFolder: string = "Imported") {
    const children = element.children;
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      if (child.tagName === "DT") {
        const link = child.querySelector(":scope > A");
        const subFolder = child.querySelector(":scope > H3");
        const subList = child.querySelector(":scope > DL");

        if (link) {
          bookmarks.push({
            url: link.getAttribute("href") || "",
            title: link.textContent?.trim() || undefined,
            folder: currentFolder,
          });
        } else if (subFolder && subList) {
          traverse(subList, subFolder.textContent?.trim() || currentFolder);
        }
      } else if (child.tagName === "DL") {
        traverse(child, currentFolder);
      }
    }
  }

  const rootDl = doc.querySelector("DL");
  if (rootDl) traverse(rootDl);
  return bookmarks;
}

/**
 * Parse JSON export (Raindrop.io, Pocket, custom).
 * Expects array of { url, title?, folder?, tags? }
 */
export function parseBookmarkJson(json: string): ParsedBookmark[] {
  try {
    const data = JSON.parse(json);
    if (Array.isArray(data)) {
      return data.map((item) => ({
        url: item.url || item.link || item.href || "",
        title: item.title || item.name || undefined,
        folder: item.folder || item.collection || item.category || "Imported",
        tags: item.tags || [],
      })).filter((b) => b.url);
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Parse CSV (url,title,folder,tags format).
 */
export function parseBookmarkCsv(csv: string): ParsedBookmark[] {
  const lines = csv.trim().split("\n");
  if (lines.length < 2) return [];
  
  const headers = lines[0].toLowerCase().split(",").map((h) => h.trim());
  const urlIdx = headers.indexOf("url");
  const titleIdx = headers.indexOf("title");
  const folderIdx = headers.indexOf("folder");
  const tagsIdx = headers.indexOf("tags");

  if (urlIdx === -1) return [];

  return lines.slice(1).map((line) => {
    const cols = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
    return {
      url: cols[urlIdx] || "",
      title: titleIdx >= 0 ? cols[titleIdx] : undefined,
      folder: folderIdx >= 0 ? cols[folderIdx] : "Imported",
      tags: tagsIdx >= 0 ? cols[tagsIdx]?.split(";").map((t) => t.trim()).filter(Boolean) : [],
    };
  }).filter((b) => b.url);
}
