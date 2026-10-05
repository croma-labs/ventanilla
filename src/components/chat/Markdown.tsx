import { site } from "@country/site";
import { Fragment, type ReactNode } from "react";
import { cn } from "../../lib/cn";

type Inline =
  | { kind: "text"; text: string; strong: boolean }
  | { kind: "link"; text: string; href: string; strong: boolean };

type Block =
  | { kind: "paragraph"; inline: Inline[] }
  | { kind: "heading"; inline: Inline[] }
  | { kind: "list"; ordered: boolean; start: number; items: { inline: Inline[]; children: Inline[][] }[] };

type Item = { text: string; children: string[] };

type Allow = (href: string) => boolean;

const classes = {
  body: "m-0 type-body-m text-text-primary",
  heading: "m-0 type-body-m font-medium text-balance text-text-primary",
  strong: "font-medium text-text-primary",
  link: "max-w-full align-baseline [overflow-wrap:anywhere] text-link transition-colors hover:text-blue-700",
  underline: "underline decoration-dotted decoration-1 underline-offset-[3px] [text-decoration-skip-ink:none]",
  icon: "inline-block size-4 align-[-2px] no-underline",
};

export const linkPolicy =
  (grounded: Iterable<string>): Allow =>
  (href) =>
    href.startsWith("tel:") || (href.startsWith("/") && !href.startsWith("//")) || new Set(grounded).has(href);

const citation = /【[^】†]*†\s*(https?:\/\/[^】\s]+)[^】]*】/g;

const hostLabel = (href: string) => {
  try {
    return new URL(href).hostname.replace(/^www\./, "");
  } catch {
    return href;
  }
};

const bullet = /^\s*[-*•]\s+/;
const numbered = /^\s*\d+[.)]\s+/;

function parseInline(raw: string, allowedHref: Allow): Inline[] {
  const source = raw.replace(citation, (_, href: string) => ` ([${hostLabel(href)}](${href}))`).replace(/【[^】]*】/g, "");
  const parts: Inline[] = [];
  let strong = false;
  const pattern = /\*\*|\[([^\]]*)\]\(([^)\s]*)\)/g;
  let cursor = 0;
  const pushText = (text: string) => text && parts.push({ kind: "text", text, strong });
  for (const match of source.matchAll(pattern)) {
    pushText(source.slice(cursor, match.index));
    if (match[0] === "**") strong = !strong;
    else if (allowedHref(match[2])) parts.push({ kind: "link", text: match[1], href: match[2], strong });
    else pushText(match[1]);
    cursor = match.index + match[0].length;
  }
  pushText(source.slice(cursor).replace(/\[[^\]]*$|\[[^\]]*\]\([^)]*$/, ""));
  return parts;
}

export function parseMarkdown(source: string, allow: Allow): Block[] {
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  let list: { ordered: boolean; start: number; items: Item[] } | null = null;
  const flush = () => {
    if (paragraph.length) blocks.push({ kind: "paragraph", inline: parseInline(paragraph.join(" "), allow) });
    if (list)
      blocks.push({
        kind: "list",
        ordered: list.ordered,
        start: list.start,
        items: list.items.filter((item) => item.text.trim()).map((item) => ({ inline: parseInline(item.text, allow), children: item.children.map((child) => parseInline(child, allow)) })),
      });
    paragraph = [];
    list = null;
  };
  for (const raw of source.split("\n")) {
    const line = raw.trimEnd();
    if (!line.trim() || /^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      if (!list) flush();
      continue;
    }
    if (/^\s*#{1,6}\s/.test(line)) {
      flush();
      blocks.push({ kind: "heading", inline: parseInline(line.replace(/^\s*#+\s*/, ""), allow) });
      continue;
    }
    const indented = /^\s{2,}/.test(raw);
    const ordered = numbered.test(line);
    const last = list?.items.at(-1);
    if (bullet.test(line) && list?.ordered && last && (indented || /:\**\s*$/.test(last.text) || last.children.length)) {
      last.children.push(line.replace(bullet, ""));
      continue;
    }
    if (ordered || bullet.test(line)) {
      if (paragraph.length || (list && list.ordered !== ordered)) flush();
      list ??= { ordered, start: ordered ? Number(line.match(/\d+/)![0]) : 1, items: [] };
      list.items.push({ text: line.replace(ordered ? numbered : bullet, ""), children: [] });
      continue;
    }
    if (list && indented && last) {
      if (last.children.length) last.children[last.children.length - 1] += ` ${line.trim()}`;
      else last.text += ` ${line.trim()}`;
      continue;
    }
    if (list) flush();
    paragraph.push(line.trim());
  }
  flush();
  return blocks;
}

export function holdBackTail(text: string) {
  const blockStart = text.lastIndexOf("\n\n") + 1;
  const tail = text.slice(blockStart);
  const words = [...tail.matchAll(/\S+/g)];
  const endsClean = /\s$/.test(tail);
  const withheld = endsClean ? 2 : 3;
  if (words.length <= withheld) return text.slice(0, blockStart);
  const cut = words[words.length - withheld].index ?? tail.length;
  return text.slice(0, blockStart + cut);
}

function Words({ text, prefix }: { text: string; prefix: string }) {
  const tokens = text.split(/(\s+)/);
  return (
    <>
      {tokens.map((token, index) =>
        !token ? null : /^\s+$/.test(token) ? (
          <Fragment key={`${prefix}-s${index}`}>{token}</Fragment>
        ) : (
          <span key={`${prefix}-w${index}`} data-sd-animate>
            {token}
          </span>
        ),
      )}
    </>
  );
}

const ArrowUpRight = () => (
  <svg aria-hidden className={cn(classes.icon, "align-[-2.5px]")} viewBox="0 0 20 20" width="16" height="16">
    <path d="M6 4V6H12.59L4 14.59L5.41 16L14 7.41V14H16V4H6Z" fill="currentColor" />
  </svg>
);

const Phone = () => (
  <svg aria-hidden className={cn(classes.icon, "mr-0.5")} viewBox="0 0 20 20" width="16" height="16">
    <path
      d="M6.31 4L6.86 7.31L5.17 9C4.59 7.56 4.22 5.89 4.07 4H6.3M12.69 13.14L16 13.69V15.92C14.11 15.77 12.44 15.41 11 14.82L12.69 13.13M2 2C2 12 7 18 18 18V13.69C18 12.71 17.29 11.88 16.33 11.72L13.02 11.17C12.38 11.06 11.73 11.27 11.28 11.73L9.01 14L6.01 11L8.28 8.73C8.74 8.27 8.94 7.62 8.84 6.99L8.29 3.68C8.13 2.72 7.29 2.01 6.32 2.01H2V2Z"
      fill="currentColor"
    />
  </svg>
);

function Link({ text, href, prefix }: { text: string; href: string; prefix: string }) {
  if (href.startsWith("tel:")) {
    return (
      <a href={href} data-sd-animate className={cn(classes.link, "inline-block font-normal")}>
        <Phone />
        <span className={classes.underline}>{text}</span>
      </a>
    );
  }
  const words = text.split(" ");
  const last = words.pop();
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      aria-label={`${text} (${site.ui.newTab})`}
      data-sd-animate
      key={prefix}
      className={cn(classes.link, "inline")}
    >
      {words.length > 0 && <span className={classes.underline}>{`${words.join(" ")} `}</span>}
      <span className="whitespace-nowrap">
        <span className={classes.underline}>{last}</span>
        <ArrowUpRight />
      </span>
    </a>
  );
}

function InlineContent({ inline, prefix }: { inline: Inline[]; prefix: string }) {
  return (
    <>
      {inline.map((part, index) => {
        const key = `${prefix}-${index}`;
        const content =
          part.kind === "link" ? <Link text={part.text} href={part.href} prefix={key} /> : <Words text={part.text} prefix={key} />;
        return part.strong ? (
          <strong key={key} className={classes.strong}>
            {content}
          </strong>
        ) : (
          <Fragment key={key}>{content}</Fragment>
        );
      })}
    </>
  );
}

export default function Markdown({ text, animate, links = [] }: { text: string; animate: boolean; links?: string[] }) {
  const blocks = parseMarkdown(text, linkPolicy(links));
  const render = (block: Block, index: number): ReactNode => {
    const prefix = `b${index}`;
    if (block.kind === "heading")
      return (
        <h3 key={prefix} className={cn(classes.heading, "mt-6 [&+*]:mt-4")}>
          <InlineContent inline={block.inline} prefix={prefix} />
        </h3>
      );
    if (block.kind === "list") {
      const List = block.ordered ? "ol" : "ul";
      return (
        <List
          key={prefix}
          start={block.ordered ? block.start : undefined}
          style={block.ordered ? { counterReset: `step ${block.start - 1}` } : undefined}
          className={cn("m-0 mt-6", block.ordered ? "markdown-ordered-list" : "markdown-unordered-list")}
        >
          {block.items.map((item, itemIndex) => (
            <li key={`${prefix}-${itemIndex}`} className="m-0">
              <InlineContent inline={item.inline} prefix={`${prefix}-${itemIndex}`} />
              {item.children.length > 0 && (
                <ul className="markdown-unordered-list m-0 mt-2 pl-0">
                  {item.children.map((child, childIndex) => (
                    <li key={childIndex} className="m-0">
                      <InlineContent inline={child} prefix={`${prefix}-${itemIndex}-${childIndex}`} />
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </List>
      );
    }
    return (
      <p key={prefix} className={cn(classes.body, "mt-6")}>
        <InlineContent inline={block.inline} prefix={prefix} />
      </p>
    );
  };
  return (
    <div
      data-animated={animate || undefined}
      className="response-root type-body-m text-text-primary [text-wrap:stable] [&>*:first-child]:mt-0"
    >
      {blocks.map(render)}
    </div>
  );
}
