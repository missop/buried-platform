import { useEffect, useRef } from "react";
import "./App.css";

function App() {
  const selectionDom = useRef(null);

  useEffect(() => {
    const iframe = document.getElementById("iframe");
    let currentElementInfo = null;

    if (iframe && selectionDom.current) {
      iframe.contentWindow.addEventListener("message", function (e) {
        const { info, pos, xpath } = e.data || {};
        currentElementInfo = e.data;
        if (xpath === "/html/body") {
          selectionDom.current.style = {};
          return;
        }

        selectionDom.current.style.top = pos.top + "px";
        selectionDom.current.style.left = pos.left + "px";
        selectionDom.current.style.width = info.width + "px";
        selectionDom.current.style.height = info.height + "px";
      });
    }

    selectionDom.current.addEventListener("click", function (e) {
      alert(JSON.stringify(currentElementInfo));
      e.stopPropagation();
    },true);

    return () => {};
  }, [selectionDom.current]);

  return (
    <div className="App">
      <div className="flex">
        <div>
          <iframe id="iframe" src="/app.html" width="375" height="667" title="app.html"></iframe>
          <div ref={selectionDom} className="selection"></div>
        </div>

        <div>
          <h2>配置文件Config.js</h2>
        </div>
      </div>
    </div>
  );
}

export default App;
