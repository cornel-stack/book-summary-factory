import React from "react";
import type { Scene, WordTiming } from "../schema";
import { SectionTitle } from "./SectionTitle";
import { QuoteCard } from "./QuoteCard";
import { CharacterScene } from "./CharacterScene";
import { ListCard } from "./ListCard";
import { StatChart } from "./StatChart";
import { RecapCard } from "./RecapCard";
import { CtaCard } from "./CtaCard";

/** Maps a validated scene to its visual component, threading word timings. */
export const SceneRenderer: React.FC<{ scene: Scene; words: WordTiming[] }> = ({
  scene,
  words,
}) => {
  switch (scene.type) {
    case "section_title":
      return <SectionTitle visual={scene.visual} words={words} />;
    case "quote_card":
      return <QuoteCard visual={scene.visual} />;
    case "character_scene":
      return <CharacterScene visual={scene.visual} words={words} />;
    case "list_card":
      return <ListCard visual={scene.visual} words={words} />;
    case "stat_chart":
      return <StatChart visual={scene.visual} words={words} />;
    case "recap_card":
      return <RecapCard visual={scene.visual} words={words} />;
    case "cta":
      return <CtaCard visual={scene.visual} />;
  }
};
