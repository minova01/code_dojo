export function DojoScene() {
  return (
    <div className="dojo-scene" aria-label="一座位于山间的像素风技术道场" role="img">
      <div className="sun" />
      <div className="cloud cloud-one" />
      <div className="cloud cloud-two" />
      <div className="mountain mountain-back" />
      <div className="mountain mountain-front" />
      <div className="dojo-building">
        <div className="roof roof-top" />
        <div className="dojo-sign">道</div>
        <div className="roof roof-main" />
        <div className="dojo-wall">
          <div className="window" />
          <div className="door"><span /></div>
          <div className="window" />
        </div>
      </div>
      <div className="ground-line" />
      <div className="pixel-grass grass-one" />
      <div className="pixel-grass grass-two" />
    </div>
  );
}
