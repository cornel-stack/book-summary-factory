import React from "react";
import { AbsoluteFill, Sequence, useCurrentFrame } from "remotion";
import { COLORS, FONTS } from "./theme";
import { DrawingBoard } from "./components/DrawingBoard";
import { castBoardElement } from "./components/CastCharacter";
import { Effect } from "./components/Effects";

const Caption: React.FC<{ text: string }> = ({ text }) => (
  <div style={{ position: "absolute", bottom: 50, width: "100%", textAlign: "center", fontFamily: FONTS.heading, fontSize: 48, color: COLORS.ink }}>
    {text}
  </div>
);

/** Beat 1 — Alex: side walk-in → squash-turn to front → point → sit at a desk.
 *  The desk + chair are part of the rig now (drawn with the figure, hands land
 *  on the desk line), so there's no separately-placed furniture to drift. */
const AlexBeat: React.FC = () => {
  const frame = useCurrentFrame();
  const el = castBoardElement({
    key: "alex",
    castId: "alex",
    box: { x: 740, y: 210, w: 440, h: 690 },
    startFrame: 0,
    sceneFrame: frame,
    poses: ["walking", "standing", "pointing", "sitting"],
    expressionSteps: [{ value: "happy", atFrame: 0 }, { value: "curious", atFrame: 200 }],
    seat: "desk",
    label: "Alex",
  });
  return (
    <AbsoluteFill>
      <DrawingBoard elements={[el]} />
      <Effect kind="idea_flash" x={975} y={300} size={210} frame={frame} startFrame={205} duration={60} />
      <Caption text="side walk-in · turn to front · point · sit at a desk (hands on desk)" />
    </AbsoluteFill>
  );
};

/** Beat 2 — Maya walks in (side) carrying a book. */
const CarryBeat: React.FC = () => {
  const frame = useCurrentFrame();
  const el = castBoardElement({
    key: "maya",
    castId: "maya",
    box: { x: 760, y: 230, w: 420, h: 660 },
    startFrame: 0,
    sceneFrame: frame,
    poses: ["walking", "standing"],
    expressions: ["happy"],
    holding: { prop: "book", hand: "left" },
    label: "Maya",
    seed: "maya-carry",
  });
  return (
    <AbsoluteFill>
      <DrawingBoard elements={[el]} />
      <Caption text="a held prop, carried while walking" />
    </AbsoluteFill>
  );
};

/** Beat 3 — Sage + Max duo: staggered idles, nod vs head-shake. */
const DuoBeat: React.FC = () => {
  const frame = useCurrentFrame();
  const sage = castBoardElement({ key: "sage", castId: "sage", box: { x: 250, y: 170, w: 400, h: 740 }, startFrame: 0, sceneFrame: frame, poses: ["standing", "presenting"], expressions: ["happy"], action: { kind: "nod", startFrame: 150 }, label: "Sage", seed: "sage-duo" });
  const max = castBoardElement({ key: "max", castId: "max", box: { x: 1280, y: 200, w: 420, h: 700 }, startFrame: 0, sceneFrame: frame, poses: ["standing"], expressions: ["worried"], flip: true, action: { kind: "headshake", startFrame: 165 }, label: "Max", seed: "max-duo" });
  return (
    <AbsoluteFill>
      <DrawingBoard elements={[sage, max]} />
      <Caption text="two-character beat · nod vs head-shake" />
    </AbsoluteFill>
  );
};

/** Beat 4 — Pip comic double-take. */
const PipBeat: React.FC = () => {
  const frame = useCurrentFrame();
  const el = castBoardElement({ key: "pip", castId: "pip", box: { x: 780, y: 300, w: 360, h: 600 }, startFrame: 0, sceneFrame: frame, poses: ["standing"], expressionSteps: [{ value: "happy", atFrame: 0 }, { value: "shocked", atFrame: 60 }], action: { kind: "shake", startFrame: 60 }, label: "Pip", seed: "pip" });
  return (
    <AbsoluteFill>
      <DrawingBoard elements={[el]} />
      <Effect kind="exclamation" x={960} y={360} size={200} frame={frame} startFrame={60} duration={55} />
      <Caption text="Pip — comic double-take" />
    </AbsoluteFill>
  );
};

export const MotionTest: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: COLORS.paper }}>
    <Sequence durationInFrames={300}><AlexBeat /></Sequence>
    <Sequence from={300} durationInFrames={140}><CarryBeat /></Sequence>
    <Sequence from={440} durationInFrames={190}><DuoBeat /></Sequence>
    <Sequence from={630} durationInFrames={150}><PipBeat /></Sequence>
  </AbsoluteFill>
);
