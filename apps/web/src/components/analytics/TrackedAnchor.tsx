"use client";

import type {
  ComponentPropsWithoutRef,
  MouseEventHandler,
} from "react";
import {
  captureEvent,
  type AnalyticsEventName,
  type EventPayloadMap,
} from "@/lib/analytics";

interface TrackedAnchorProps<K extends AnalyticsEventName>
  extends Omit<ComponentPropsWithoutRef<"a">, "onClick"> {
  eventName: K;
  eventProperties: EventPayloadMap[K];
  onClick?: MouseEventHandler<HTMLAnchorElement>;
}

export function TrackedAnchor<K extends AnalyticsEventName>({
  eventName,
  eventProperties,
  onClick,
  children,
  ...props
}: TrackedAnchorProps<K>) {
  return (
    <a
      {...props}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) {
          captureEvent(eventName, eventProperties);
        }
      }}
    >
      {children}
    </a>
  );
}
