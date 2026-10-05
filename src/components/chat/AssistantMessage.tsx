import { useEffect } from "react";
import type { Grounding } from "../../lib/ui-stream";
import { useTextPlayout } from "../../lib/playout";
import FollowUps from "./FollowUps";
import Markdown, { holdBackTail } from "./Markdown";
import MessageActions, { actionGroupCount } from "./MessageActions";
import { Unverified } from "./SourceList";

export type AssistantState = {
  id: string;
  text: string;
  streaming: boolean;
  groundings: Grounding[];
  followUps: string[];
  verified?: boolean;
  conversational?: boolean;
};

type Props = {
  message: AssistantState;
  animate: boolean;
  isLast: boolean;
  busy: boolean;
  onPlayout: (playing: boolean) => void;
};

export default function AssistantMessage({ message, animate, isLast, busy, onPlayout }: Props) {
  const { visible, playing } = useTextPlayout(message.text, message.streaming, animate);
  const live = message.streaming || playing;
  const shown = live ? holdBackTail(visible) : visible;
  const done = !live;

  useEffect(() => onPlayout(live), [live, onPlayout]);

  if (!shown.trim()) return null;

  return (
    <div data-slot="message" data-align="start" className="group/message relative flex w-full min-w-0 gap-2 type-body-m">
      <div data-slot="message-content" dir="auto" className="flex w-full min-w-0 flex-col gap-2.5 wrap-break-word">
        <div className="flex flex-col gap-4 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
          <Markdown text={shown} animate={animate} links={message.groundings.map((grounding) => grounding.url)} />
        </div>
        {done && message.verified === false && !message.conversational && <Unverified />}
        {done && <MessageActions groundings={message.groundings} text={message.text} />}
        {done && isLast && message.followUps.length > 0 && (
          <FollowUps suggestions={message.followUps} delayStart={actionGroupCount(message.groundings) * 80} disabled={busy} />
        )}
      </div>
    </div>
  );
}
