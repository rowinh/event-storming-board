const width = window.innerWidth;
const height = window.innerHeight;

const stickyTypes = {
    DomainEvent: { text: 'Domain Event', color: '#FF9900' },
    Command: { text: 'Command', color: '#4477FF' },
    Aggregate: { text: 'Aggregate', color: '#99CC00' },
    Policy: { text: 'Policy', color: '#9900CC' },
    User: { text: 'User', color: '#FF66CC' },
    ReadModel: { text: 'Read Model', color: '#FFFF66' },
};

const stage = new Konva.Stage({ container: 'container', width: width, height: height, draggable: true });

const gridLayer = new Konva.Layer();
stage.add(gridLayer);
const mainLayer = new Konva.Layer();
stage.add(mainLayer);

const tr = new Konva.Transformer({
    keepRatio: false,
    borderStroke: '#009dff',
    borderStrokeWidth: 2,
    anchorStroke: '#009dff',
    anchorFill: 'white',
    anchorSize: 10,
    boundBoxFunc: (oldBox, newBox) => (newBox.width < 20 || newBox.height < 20) ? oldBox : newBox
});
mainLayer.add(tr);

function drawGrid() {
    gridLayer.destroyChildren();
    const gridSize = 50;
    const stageRect = { x: -stage.x() / stage.scaleX(), y: -stage.y() / stage.scaleY(), width: width / stage.scaleX(), height: height / stage.scaleY() };
    const startX = Math.floor(stageRect.x / gridSize) * gridSize;
    const endX = Math.ceil((stageRect.x + stageRect.width) / gridSize) * gridSize;
    const startY = Math.floor(stageRect.y / gridSize) * gridSize;
    const endY = Math.ceil((stageRect.y + stageRect.height) / gridSize) * gridSize;

    for (let x = startX; x < endX; x += gridSize) {
        gridLayer.add(new Konva.Line({ points: [x, startY, x, endY], stroke: '#e0e0e0', strokeWidth: 1 / stage.scaleX() }));
    }
    for (let y = startY; y < endY; y += gridSize) {
        gridLayer.add(new Konva.Line({ points: [startX, y, endX, y], stroke: '#e0e0e0', strokeWidth: 1 / stage.scaleY() }));
    }
    gridLayer.batchDraw();
}
drawGrid();

const scaleBy = 1.1;
stage.on('wheel', (e) => {
    e.evt.preventDefault();
    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();
    const mousePointTo = { x: (pointer.x - stage.x()) / oldScale, y: (pointer.y - stage.y()) / oldScale };
    const newScale = e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy;
    stage.scale({ x: newScale, y: newScale });
    const newPos = { x: pointer.x - mousePointTo.x * newScale, y: pointer.y - mousePointTo.y * newScale };
    stage.position(newPos);
    drawGrid();
});
stage.on('dragmove', drawGrid);

let nodes = [];
let stickyCounter = 0;

function newSticky(x, y, typeName, typeInfo, id = null, label = null, width = 150, height = 100) {
    const newId = id || 'node-' + stickyCounter++;
    if (!id) stickyCounter = Math.max(stickyCounter, parseInt(newId.split('-')[1]) + 1);

    const stickyGroup = new Konva.Group({ x: x, y: y, draggable: true, id: newId, dragOnTop: false });

    const stickyRect = new Konva.Rect({ width: width, height: height, fill: typeInfo.color, cornerRadius: 5, shadowColor: 'black', shadowBlur: 10, shadowOpacity: 0.3, shadowOffsetX: 5, shadowOffsetY: 5 });
    const stickyText = new Konva.Text({ text: label || typeInfo.text, fontSize: 16, fontFamily: 'sans-serif', fill: '#333', width: width, height: height, padding: 10, align: 'center', verticalAlign: 'middle' });

    stickyGroup.add(stickyRect, stickyText);
    // This is the definitive fix: By stopping the 'mousedown' event from bubbling
    // up to the stage, we prevent the stage from ever entering its own drag
    // state when the user's intent is to interact with a sticky.
    stickyGroup.on('mousedown', (e) => {
        e.evt.stopPropagation();
    });
    mainLayer.add(stickyGroup);
    nodes.push({ id: newId, type: typeName, textObj: stickyText, rectObj: stickyRect, group: stickyGroup });

    stage.draw();

    stickyGroup.on('click', (e) => {
        e.evt.stopPropagation();
        const isMultiSelect = e.evt.shiftKey || e.evt.ctrlKey || e.evt.metaKey;
        selectNodes([newId], isMultiSelect);
    });

    stickyGroup.on('dblclick dbltap', () => {
        const textPosition = stickyGroup.getAbsolutePosition();
        const stageBox = stage.container().getBoundingClientRect();
        const areaPosition = { x: stageBox.left + textPosition.x, y: stageBox.top + textPosition.y };
        const textarea = document.createElement('textarea');
        document.body.appendChild(textarea);
        textarea.value = stickyText.text();
        Object.assign(textarea.style, { position: 'absolute', top: areaPosition.y + 'px', left: areaPosition.x + 'px', width: stickyRect.width() + 'px', height: stickyRect.height() + 'px', border: 'none', resize: 'none', background: 'transparent', fontSize: '16px', fontFamily: 'sans-serif', textAlign: 'center', padding: '10px', boxSizing: 'border-box' });
        stickyText.hide();
        mainLayer.draw();
        textarea.focus();
        function removeTextarea() {
            if (document.body.contains(textarea)) {
                document.body.removeChild(textarea);
                stickyText.text(textarea.value);
                stickyText.show();
                mainLayer.draw();
            }
        }
        textarea.addEventListener('blur', removeTextarea);
        textarea.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) removeTextarea(); });
    });

    // The 'transform' event is removed. We will handle the logic in 'transformend'.
}

function selectNodes(ids, isMultiSelect = false) {
    let selectedIds = tr.nodes().map(n => n.id());

    if (isMultiSelect) {
        ids.forEach(id => {
            if (selectedIds.includes(id)) {
                selectedIds = selectedIds.filter(selectedId => selectedId !== id);
            } else {
                selectedIds.push(id);
            }
        });
    } else {
        // If clicking a single already-selected node, do nothing. Otherwise, select only that node.
        if (selectedIds.length === 1 && selectedIds[0] === ids[0]) {
            return;
        }
        selectedIds = ids;
    }

    const newNodes = selectedIds.map(id => mainLayer.findOne('#' + id)).filter(Boolean);
    tr.nodes(newNodes);
    mainLayer.batchDraw();
}

stage.on('click', (e) => { if (e.target === stage) selectNodes([]); });

// When a transform operation ends, we need to iterate through all transformed
// nodes to ensure their internal state (width/height) is updated correctly.
tr.on('transformend', () => {
    tr.nodes().forEach(group => {
        const node = nodes.find(n => n.id === group.id());
        const rect = group.findOne('Rect');
        const text = group.findOne('Text');

        if (node) {
            // Apply the transformation to the inner shapes
            const newWidth = rect.width() * group.scaleX();
            const newHeight = rect.height() * group.scaleY();
            rect.size({ width: newWidth, height: newHeight });
            text.size({ width: newWidth, height: newHeight });

            // Reset the group's scale
            group.scaleX(1);
            group.scaleY(1);
        }
    });
});

window.addEventListener('keydown', (e) => {
    if ((e.key === 'Backspace' || e.key === 'Delete') && document.activeElement.tagName.toLowerCase() !== 'textarea') {
        const selectedKonvaNodes = tr.nodes();
        if (selectedKonvaNodes.length === 0) return;

        const idsToRemove = selectedKonvaNodes.map(n => n.id());
        selectedKonvaNodes.forEach(node => node.destroy());
        nodes = nodes.filter(n => !idsToRemove.includes(n.id));
        tr.nodes([]);
        mainLayer.batchDraw();
    } else if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
        e.preventDefault();
        const allNodeIds = nodes.map(n => n.id);
        selectNodes(allNodeIds, false); // false to replace current selection
    }
});

const controlsDiv = document.getElementById('controls');
Object.entries(stickyTypes).forEach(([typeName, typeInfo]) => {
    const button = document.createElement('button');
    button.textContent = `Add ${typeName}`;
    button.style.background = typeInfo.color;
    button.addEventListener('click', () => {
        const stageCenter = { x: (-stage.x() + width / 2) / stage.scaleX(), y: (-stage.y() + height / 2) / stage.scaleY() };
        newSticky(stageCenter.x, stageCenter.y, typeName, typeInfo);
    });
    controlsDiv.appendChild(button);
});

document.getElementById('saveBtn').addEventListener('click', () => {
    const saveData = nodes.map(n => ({ id: n.id, type: n.type, label: n.textObj.text(), x: n.group.x(), y: n.group.y(), width: n.rectObj.width(), height: n.rectObj.height() }));
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(saveData, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "board-save.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
});

document.getElementById('loadBtn').addEventListener('click', () => document.getElementById('fileInput').click());

document.getElementById('fileInput').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
        const loadedNodes = JSON.parse(event.target.result);
        mainLayer.destroyChildren();
        nodes = [];
        loadedNodes.forEach(nodeData => {
            const typeInfo = stickyTypes[nodeData.type];
            if (typeInfo) newSticky(nodeData.x, nodeData.y, nodeData.type, typeInfo, nodeData.id, nodeData.label, nodeData.width, nodeData.height);
        });
        mainLayer.batchDraw();
    };
    reader.readAsText(file);
    e.target.value = '';
});

document.getElementById('resetBtn').addEventListener('click', () => {
    if (confirm('Are you sure you want to clear the entire board?')) {
        mainLayer.destroyChildren();
        nodes = [];
        tr.nodes([]);
        mainLayer.draw();
    }
});

document.getElementById('exportBtn').addEventListener('click', () => {
    const currentNodes = nodes.map(n => ({ id: n.id, type: n.type, label: n.textObj.text(), x: n.group.x(), y: n.group.y(), width: n.rectObj.width(), height: n.rectObj.height() }));
    const graph = translateToGraph(currentNodes);
    const jsonLd = {
        "@context": { "@version": 1.1, "@base": "https://eventstorming.linked.events/resource/", "es": "https://eventstorming.linked.events/ontology#", "rdfs": "http://www.w3.org/2000/01/rdf-schema#", "label": "rdfs:label", "precededBy": { "@id": "es:precededBy", "@type": "@id" }, "triggers": { "@id": "es:triggers", "@type": "@id" }, "target": { "@id": "es:target", "@type": "@id" }, "initiates": { "@id": "es:initiates", "@type": "@id" }, "updates": { "@id": "es:updates", "@type": "@id" } },
        "@graph": graph
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(jsonLd, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "output.jsonld");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
});

document.getElementById('exportMdBtn').addEventListener('click', () => {
    const currentNodes = nodes.map(n => ({ id: n.id, type: n.type, label: n.textObj.text(), x: n.group.x(), y: n.group.y(), width: n.rectObj.width(), height: n.rectObj.height() }));
    const graph = translateToGraph(currentNodes);
    const markdown = translateToMarkdown(graph);

    const dataStr = "data:text/markdown;charset=utf-8," + encodeURIComponent(markdown);
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "output.md");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
});

function translateToMarkdown(graph) {
    const nodeMap = new Map(graph.map(n => [n['@id'], n]));
    const findNode = id => nodeMap.get(id);

    const sections = {
        DomainEvent: [],
        Command: [],
        Aggregate: [],
        Policy: [],
        User: [],
        ReadModel: []
    };

    graph.forEach(node => {
        const type = node['@type'].replace('es:', '');
        if (sections[type]) {
            sections[type].push(node);
        }
    });

    let md = "# Event Storming Diagram\n\n";

    // 1. Timeline
    md += "## Timeline\n\n";
    const timelineEvents = sections.DomainEvent.sort((a, b) => {
        let aNode = a;
        while (aNode.precededBy) aNode = findNode(aNode.precededBy);
        let bNode = b;
        while (bNode.precededBy) bNode = findNode(bNode.precededBy);
        return graph.indexOf(aNode) - graph.indexOf(bNode); // Fallback sort
    });

    const sortedEvents = [];
    let currentEvent = timelineEvents.find(e => !e.precededBy && timelineEvents.some(other => other.precededBy === e['@id']));
    if (!currentEvent && timelineEvents.length > 0) currentEvent = timelineEvents[0];
    const visited = new Set();
    while(currentEvent && !visited.has(currentEvent['@id'])) {
        sortedEvents.push(currentEvent);
        visited.add(currentEvent['@id']);
        currentEvent = timelineEvents.find(e => e.precededBy === currentEvent['@id']);
    }

    sortedEvents.forEach((event, index) => {
        md += `${index + 1}. **${event.label}** (*Domain Event*)\n`;
    });

    return md;
}

function translateToGraph(boardNodes) {
    const graphNodes = boardNodes.map(n => ({ "@id": n.id, "@type": "es:" + n.type, "label": n.label, "es:width": n.width, "es:height": n.height }));
    const nodeMap = new Map(graphNodes.map(n => [n['@id'], n]));

    const distance = (n1, n2) => Math.sqrt(Math.pow(n1.x - n2.x, 2) + Math.pow(n1.y - n2.y, 2));

    const findClosest = (source, targets, constraints = {}) => {
        let candidates = targets;
        if (constraints.direction === 'right') candidates = candidates.filter(t => t.x > source.x);
        if (constraints.direction === 'left') candidates = candidates.filter(t => t.x < source.x);
        if (constraints.vAlign === 'above') candidates = candidates.filter(t => t.y < source.y);
        if (constraints.vAlign === 'below') candidates = candidates.filter(t => t.y > source.y);
        if (candidates.length === 0) return null;
        return candidates.reduce((closest, current) => distance(source, current) < distance(source, closest) ? current : closest);
    };

    const events = boardNodes.filter(n => n.type === 'DomainEvent').sort((a, b) => a.x - b.x);
    const commands = boardNodes.filter(n => n.type === 'Command');
    const aggregates = boardNodes.filter(n => n.type === 'Aggregate');
    const users = boardNodes.filter(n => n.type === 'User');
    const policies = boardNodes.filter(n => n.type === 'Policy');
    const readModels = boardNodes.filter(n => n.type === 'ReadModel');

    for (let i = 1; i < events.length; i++) {
        const to = nodeMap.get(events[i].id);
        if(to) to.precededBy = events[i-1].id;
    }

    commands.forEach(c => {
        const commandNode = nodeMap.get(c.id);
        const closestEvent = findClosest(c, events, { direction: 'right' });
        if (closestEvent) commandNode.triggers = closestEvent.id;
        const closestAgg = findClosest(c, aggregates, { vAlign: 'above' });
        if (closestAgg) commandNode.target = closestAgg.id;
    });

    users.forEach(u => {
        const userNode = nodeMap.get(u.id);
        const closestCommand = findClosest(u, commands, { direction: 'right' });
        if (closestCommand) userNode.initiates = closestCommand.id;
    });
    
    readModels.forEach(rm => {
        const readModelNode = nodeMap.get(rm.id);
        const closestEvent = findClosest(rm, events, { vAlign: 'above' });
        if (closestEvent) {
            const eventNode = nodeMap.get(closestEvent.id);
            if(eventNode) eventNode.updates = rm.id;
        }
    });

    policies.forEach(p => {
        const policyNode = nodeMap.get(p.id);
        const triggerEvent = findClosest(p, events, { direction: 'left' });
        if (triggerEvent) {
             const eventNode = nodeMap.get(triggerEvent.id);
             if(eventNode) eventNode.triggers = p.id;
        }
        const outputCommand = findClosest(p, commands, { direction: 'right' });
        if (outputCommand) policyNode.triggers = outputCommand.id;
    });

    return graphNodes;
}