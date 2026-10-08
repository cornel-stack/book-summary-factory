import React from "react";
import { Composition, Still } from "remotion";
import { Video } from "./Video";
import { Thumbnail } from "./Thumbnail";
import { CastSheetPoses, CastSheetExpr } from "./CastSheet";
import { CastGestureSheet } from "./CastGestureSheet";
import { CastSideSheet } from "./CastSideSheet";
import { CastCheckSheet } from "./CastCheckSheet";
import { CastSideExprCheck } from "./CastSideExprCheck";
import { PropSheet } from "./PropSheet";
import { StageSheet } from "./StageSheet";
import { TravelTest } from "./TravelTest";
import { WardrobeCompare } from "./WardrobeCompare";
import { PeepsCalib } from "./PeepsCalib";
import { PeepsFusionSheet } from "./PeepsFusionSheet";
import { CrowdDemo } from "./CrowdDemo";
import { MotionTest } from "./MotionTest";
import { VIDEO } from "./theme";
import type { RenderProps } from "./schema";

/**
 * Placeholder default props so Remotion Studio opens without a real build.
 * Actual renders always pass `--props` (script + timing manifest), which
 * override these entirely.
 */
const defaultProps: RenderProps = {
  script: {
    id: "placeholder",
    title: "Placeholder — run build:video to generate real props",
    book: { title: "Book", author: "Author" },
    description: "placeholder",
    tags: [],
    thumbnail: { headline: "Headline", subline: "Subline", cast: "max", pose: "thinking", expression: "curious", props: [] },
    voice: "en-US-AndrewNeural",
    target_minutes: 30,
    template: { framing: "book-structure", hook: "direct" },
    scenes: [
      {
        id: "placeholder",
        type: "section_title",
        narration: "placeholder",
        visual: { title: "Placeholder", emphasis: "underline" },
      },
    ],
  },
  manifest: {
    videoId: "placeholder",
    fps: VIDEO.fps,
    width: VIDEO.width,
    height: VIDEO.height,
    totalDurationInFrames: VIDEO.fps * 2,
    scenes: [
      {
        id: "placeholder",
        type: "section_title",
        startFrame: 0,
        durationInFrames: VIDEO.fps * 2,
        audioFile: "assets/placeholder/missing.mp3",
        audioDurationSec: 2,
        words: [],
      },
    ],
  },
};

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="Main"
        component={Video}
        width={VIDEO.width}
        height={VIDEO.height}
        fps={VIDEO.fps}
        durationInFrames={defaultProps.manifest.totalDurationInFrames}
        defaultProps={defaultProps}
        // Duration/fps/resolution are driven by the timing manifest at render time.
        calculateMetadata={({ props }) => ({
          durationInFrames: Math.max(1, props.manifest.totalDurationInFrames),
          fps: props.manifest.fps,
          width: props.manifest.width,
          height: props.manifest.height,
        })}
      />
      <Still id="CastSheetPoses" component={CastSheetPoses} width={VIDEO.width} height={VIDEO.height} />
      <Still id="CastSheetExpr" component={CastSheetExpr} width={VIDEO.width} height={VIDEO.height} />
      <Still id="CastGestureSheet" component={CastGestureSheet} width={VIDEO.width} height={VIDEO.height} />
      <Still id="CastSideSheet" component={CastSideSheet} width={VIDEO.width} height={VIDEO.height} />
      <Still id="CastCheckSheet" component={CastCheckSheet} width={VIDEO.width} height={VIDEO.height} />
      <Still id="CastSideExprCheck" component={CastSideExprCheck} width={VIDEO.width} height={VIDEO.height} />
      <Still id="PropSheet" component={PropSheet} width={VIDEO.width} height={VIDEO.height} />
      <Still id="StageSheet" component={StageSheet} width={VIDEO.width} height={VIDEO.height} />
      <Composition id="TravelTest" component={TravelTest} width={VIDEO.width} height={VIDEO.height} fps={VIDEO.fps} durationInFrames={130} />
      <Still id="WardrobeCompare" component={WardrobeCompare} width={VIDEO.width} height={VIDEO.height} />
      <Still id="PeepsCalib" component={PeepsCalib} width={1080} height={1080} />
      <Still id="PeepsFusionSheet" component={PeepsFusionSheet} width={VIDEO.width} height={VIDEO.height} />
      <Still id="CrowdDemo" component={CrowdDemo} width={VIDEO.width} height={VIDEO.height} />
      <Composition id="MotionTest" component={MotionTest} width={VIDEO.width} height={VIDEO.height} fps={VIDEO.fps} durationInFrames={780} />
      <Still
        id="Thumbnail"
        component={Thumbnail}
        width={VIDEO.width}
        height={VIDEO.height}
        defaultProps={defaultProps}
      />
    </>
  );
};
