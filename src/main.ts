import "@logseq/libs";

import { logseq as PL } from "../package.json";
import { initSetting } from "./setting";
import { debounce } from "./utils";
import { PageEntity } from "@logseq/libs/dist/LSPlugin.user";

const DISABLED_KEY = "b-yp-breadcrumb-disabled";
const BREADCRUMB_ID = "b-yp-breadcrumb";
const pluginId = PL.id;
const keys = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Enter"];
let page: PageEntity | null = null;

const removeBreadcrumb = () => {
  const breadcrumbElement = parent.document.querySelector(`#${BREADCRUMB_ID}`);
  !!breadcrumbElement && breadcrumbElement.remove();
};

const getParent = async (
  blockId: string | number,
  node: HTMLDivElement,
  level: number = 0
) => {
  const block = await logseq.Editor.getBlock(blockId);
  const maxLength = logseq.settings?.maxLength || 50;
  const isEllipsis = (block?.content?.length ?? 0) > maxLength;
  const content = isEllipsis
    ? `${block?.content?.slice(0, maxLength)}...`
    : block?.content || "";

  if (level === 0 && !content) {
    removeBreadcrumb();
    return;
  }

  const span = document.createElement("span");
  span.innerHTML = level === 0 ? content : `${content} <span style="opacity: 0.6"> > </span> `;
  node.insertBefore(span, node.firstChild);
  span.addEventListener("click", async () => {
    if (!page?.name || !block?.uuid) return;
    await logseq.Editor.scrollToBlockInPage(page.name, block.uuid);
    setBreadcrumb(block.uuid);
  });

  if (!block?.parent?.id || block?.parent.id === block?.page.id) return;
  getParent(block?.parent.id, node, level + 1);
};

const setBreadcrumb = async (blockId: string | number) => {
  const block = await logseq.Editor.getBlock(blockId);
  if (block?.page.id) {
    page = await logseq.Editor.getPage(block?.page.id);
  }

  const breadcrumbElement = parent.document.querySelector(`#${BREADCRUMB_ID}`);
  const pageElement = parent.document.querySelector("#main-content-container");
  const headElement = parent.document.querySelector("#head");
  const leftSidebarElement = parent.document.querySelector("#left-sidebar");

  !!breadcrumbElement &&
    !!pageElement &&
    pageElement.removeChild(breadcrumbElement);
  const node = parent.document.createElement("div");
  node.setAttribute("id", BREADCRUMB_ID);
  node.style.position = "fixed";
  node.style.top = `${headElement?.clientHeight || 0}px`;
  node.style.left = `${(leftSidebarElement?.clientWidth || 0) + 32}px`;
  node.style.zIndex = "999";
  node.style.padding = "2px 8px";
  node.style.borderRadius = "4px";
  node.style.backgroundColor =
    "var(--ls-create-button-color-sm,var(--lx-gray-03,var(--ls-primary-background-color)))";
  node.style.border = "1px solid hsl(var(--border))";

  const styleElement = parent.document.createElement("style");
  styleElement.textContent = `
      #${BREADCRUMB_ID}>span:hover {
        color: var(--lx-accent-11,var(--ls-link-text-color,hsl(var(--primary))));
        cursor: pointer;
      }
    `;
  parent.document.head.appendChild(styleElement);

  const currentNode = pageElement?.insertBefore(node, pageElement.firstChild);
  if (!currentNode) return;

  if (!block?.parent.id) return;
  getParent(block?.parent.id, node);
};

const handleMouseDown = debounce(async () => {
  setTimeout(async () => {
    const block = await logseq.Editor.getCurrentBlock();
    if (!block?.uuid) return;
    setBreadcrumb(block.uuid);
  }, 100);
});

const handleKeyDown = debounce(async (e) => {
  if (!keys.includes((e as KeyboardEvent).key)) return;
  setTimeout(async () => {
    const block = await logseq.Editor.getCurrentBlock();
    if (!block?.uuid) return;
    setBreadcrumb(block.uuid);
  }, 100);
});

const handleContainerEvent = (event: Event, eventType: string) => {
  const target = event.target as HTMLElement;
  if (target.closest(".block-main-container")) {
    if (eventType === "mouseDown") handleMouseDown();
    if (eventType === "keyDown") handleKeyDown(event);
  }
};

const mouseDownEvent = (e: Event) => handleContainerEvent(e, "mouseDown");
const keyDownEvent = (e: Event) => handleContainerEvent(e, "keyDown");

const bindEvent = async () => {
  const container = parent.document.querySelector("#main-content-container");
  if (!container) return;
  container.addEventListener("mousedown", mouseDownEvent);
  container.addEventListener("keydown", keyDownEvent);
};

const unbindEvent = async () => {
  const container = parent.document.querySelector("#main-content-container");
  if (!container) return;
  container.removeEventListener("mousedown", mouseDownEvent);
  container.removeEventListener("keydown", keyDownEvent);
};

const setIcon = () => {
  logseq.App.registerUIItem("toolbar", {
    key: pluginId,
    template: `
      <div data-on-click="handleToggle" title="That year today" class="button">
        <svg t="1724602903714" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="17841" width="20" height="20">
          <path d="M258.108235 144.926118H136.131765l301.357176 361.291294L136.131765 867.508706h121.97647l300.032-361.291294z"
            fill="#019BDB" p-id="17842"></path>
          <path d="M619.52 144.926118H497.543529l301.357177 361.291294L497.543529 867.508706h121.976471l300.032-361.291294z"
            fill="#AAAAAA" p-id="17843"></path>
          ${
            localStorage.getItem(DISABLED_KEY) === "true"
              ? `<line x1="50" y1="50" x2="874" y2="874" stroke="gray" stroke-width="100" transform="rotate(5, 512, 512) translate(120, 0)" />`
              : ""
          }
        </svg>
      </div>
    `,
  });
};

const init = () => {
  logseq.App.onCurrentGraphChanged(removeBreadcrumb);

  logseq.App.onRouteChanged(removeBreadcrumb);

  logseq.App.onSidebarVisibleChanged(removeBreadcrumb);

  logseq.DB.onChanged((e) => {
    const uuid = e.blocks?.[0]?.uuid;
    if (uuid) {
      const isDisabled = localStorage.getItem(DISABLED_KEY);
      isDisabled === "false" && setBreadcrumb(uuid);
    }
  });
};

async function main() {
  console.info(`#${pluginId}: MAIN`);

  initSetting();
  setIcon();

  logseq.onSettingsChanged(() => {
    const isDisabled = localStorage.getItem(DISABLED_KEY);
    isDisabled === "true" ? unbindEvent() : bindEvent();
  });

  logseq.provideModel({
    handleToggle() {
      const isDisabled = localStorage.getItem(DISABLED_KEY);
      localStorage.setItem(
        DISABLED_KEY,
        isDisabled === "true" ? "false" : "true"
      );
      setIcon();
      isDisabled === "true" ? bindEvent() : unbindEvent();
      logseq.UI.showMsg(isDisabled === "true" ? "Enabled" : "Disabled");
      removeBreadcrumb();
    },
  });

  init();
}

logseq.ready(main).catch(console.error);
