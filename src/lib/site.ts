import { siteUrl } from "@/lib/env";

export const siteConfig = {
  name: "Mark Pourel",
  title: "Mark Pourel — Digital Designer",
  description: "Digital design, interactive experiences and visual systems.",
  url: siteUrl,

  author: {
    name: "Mark Pourel",
    role: "Digital Designer",
  },

  social: {
    telegram: "",
    behance: "",
    instagram: "",
  },
} as const;
