import type { SimpleIcon } from "simple-icons";

export type ProfileLink = {
  title: string;
  url: string;
  icon?: SimpleIcon;        // simple-icons slug, e.g. "instagram"
  description?: string; // short subtitle
};

export type Site = {
  name: string;
  avatar?: string; // path under public/, e.g. "/avatar.png"
  title: string;
  description: string;
};
