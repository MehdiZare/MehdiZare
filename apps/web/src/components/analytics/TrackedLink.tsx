"use client";

import Link, { type LinkProps } from "next/link";
import type { ComponentPropsWithoutRef } from "react";
import {
  captureEvent,
  type AnalyticsEventName,
  type EventPayloadMap,
} from "@/lib/analytics";

type NativeLinkProps = ComponentPropsWithoutRef<typeof Link>;

interface TrackedLinkProps<K extends AnalyticsEventName>
  extends Omit<NativeLinkProps, "href" | "onClick"> {
  href: LinkProps["href"];
  eventName: K;
  eventProperties: EventPayloadMap[K];
  onClick?: NativeLinkProps["onClick"];
}

export function TrackedLink<K extends AnalyticsEventName>({
  href,
  eventName,
  eventProperties,
  onClick,
  children,
  ...props
}: TrackedLinkProps<K>) {
  return (
    <Link
      href={href}
      {...props}
      onClick={(event) => {
        captureEvent(eventName, eventProperties);
        onClick?.(event);
      }}
    >
      {children}
    </Link>
  );
}
