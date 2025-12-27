export function renderSeatMapGT53(containerEl, options = {}) {
  const { occupied = new Set(), selected = new Set(), onToggleSeat = () => {} } = options;

  containerEl.innerHTML = "";
  const wrap = document.createElement("div");
  wrap.className = "seatmap";

  const rows = [
    [1,2,3,4],
    [5,6,7,8],
    [9,10,11,12],
    [13,14,15,16],
    [17,18,19,20],
    [21,22,23,24],
    ["DOOR", 25,26],
    [27,28,30,31],
    [29,32,33,34],
    [35,36,37,38],
    [39,40,41,42],
    [43,44,45,46],
    [47,48,null,null]
  ];

  rows.forEach(r => {
    if (r[0] === "DOOR") wrap.appendChild(makeDoorRow([r[1], r[2]], "PORTA"));
    else wrap.appendChild(makeSeatRow([r[0], r[1]], [r[2], r[3]]));
  });

  const tail = document.createElement("div");
  tail.className = "tailrow";
  [49, 50, 51, 52, 53].forEach(n => tail.appendChild(makeSeatBtn(n)));
  wrap.appendChild(tail);

  containerEl.appendChild(wrap);

  function makeSeatRow(leftPair, rightPair) {
    const row = document.createElement("div");
    row.className = "seatrow";

    row.appendChild(makeSeatBtn(leftPair[0]));
    row.appendChild(makeSeatBtn(leftPair[1]));
    row.appendChild(makeAisle());

    row.appendChild(rightPair[0] != null ? makeSeatBtn(rightPair[0]) : makeEmpty());
    row.appendChild(rightPair[1] != null ? makeSeatBtn(rightPair[1]) : makeEmpty());
    return row;
  }

  function makeDoorRow(leftPair, label) {
    const row = document.createElement("div");
    row.className = "seatrow";

    row.appendChild(makeSeatBtn(leftPair[0]));
    row.appendChild(makeSeatBtn(leftPair[1]));
    row.appendChild(makeAisle());

    const door = document.createElement("div");
    door.className = "door";
    door.textContent = label;
    row.appendChild(door);
    return row;
  }

  function makeAisle() {
    const a = document.createElement("div");
    a.className = "aisle";
    return a;
  }

  function makeEmpty() {
    const e = document.createElement("div");
    e.style.minHeight = "44px";
    return e;
  }

  function makeSeatBtn(num) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "seat";
    btn.textContent = String(num);

    if (occupied.has(num)) { btn.classList.add("occupied"); btn.disabled = true; }
    if (selected.has(num)) btn.classList.add("selected");

    btn.addEventListener("click", () => onToggleSeat(num));
    return btn;
  }
}
