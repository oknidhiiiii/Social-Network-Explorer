// --- DATA STRUCTURES ---
// Graph represented using both Adjacency Matrix and Adjacency List
class Graph {
    constructor() {
        this.nodes = [];
        this.adjList = new Map();
        this.adjMatrix = [];
    }

    addNode(node) {
        if (this.nodes.length >= 10) return false;
        if (!this.nodes.includes(node)) {
            this.nodes.push(node);
            this.adjList.set(node, []);
            
            // Expand adjacency matrix by adding a column (0) to each existing row
            for (let row of this.adjMatrix) {
                row.push(0);
            }
            // Add a new row filled with 0s for the new node
            this.adjMatrix.push(new Array(this.nodes.length).fill(0));
            return true;
        }
        return false;
    }

    addEdge(node1, node2) {
        if (!this.nodes.includes(node1) || !this.nodes.includes(node2) || node1 === node2) return false;
        
        let list1 = this.adjList.get(node1);
        let list2 = this.adjList.get(node2);
        
        // Undirected graph, so add to both lists
        if (!list1.includes(node2)) {
            list1.push(node2);
            list2.push(node1);
            
            // Update adjacency matrix
            let idx1 = this.nodes.indexOf(node1);
            let idx2 = this.nodes.indexOf(node2);
            this.adjMatrix[idx1][idx2] = 1;
            this.adjMatrix[idx2][idx1] = 1;
            return true;
        }
        return false;
    }

    getNeighbors(node) {
        return this.adjList.get(node) || [];
    }

    getDegree(node) {
        return this.getNeighbors(node).length;
    }

    removeEdge(node1, node2) {
        if (!this.nodes.includes(node1) || !this.nodes.includes(node2)) return false;
        let list1 = this.adjList.get(node1);
        let list2 = this.adjList.get(node2);
        
        let idx1 = list1.indexOf(node2);
        let idx2 = list2.indexOf(node1);
        
        if (idx1 !== -1 && idx2 !== -1) {
            list1.splice(idx1, 1);
            list2.splice(idx2, 1);
            
            let mIdx1 = this.nodes.indexOf(node1);
            let mIdx2 = this.nodes.indexOf(node2);
            this.adjMatrix[mIdx1][mIdx2] = 0;
            this.adjMatrix[mIdx2][mIdx1] = 0;
            return true;
        }
        return false;
    }

    removeNode(node) {
        if (!this.nodes.includes(node)) return false;
        
        const neighbors = [...this.getNeighbors(node)];
        for (let neighbor of neighbors) {
            this.removeEdge(node, neighbor);
        }
        
        const index = this.nodes.indexOf(node);
        this.nodes.splice(index, 1);
        this.adjList.delete(node);
        
        this.adjMatrix.splice(index, 1);
        for (let row of this.adjMatrix) {
            row.splice(index, 1);
        }
        
        return true;
    }
}

// --- UI & STATE MANAGEMENT ---
const ui = {
    usernameInput: document.getElementById('usernameInput'),
    user1Select: document.getElementById('user1Select'),
    user2Select: document.getElementById('user2Select'),
    startNodeSelect: document.getElementById('startNodeSelect'),
    nodesContainer: document.getElementById('nodesContainer'),
    edgesSvg: document.getElementById('edgesSvg'),
    outputLog: document.getElementById('outputLog'),
    adjListDiv: document.getElementById('adjList'),
    adjMatrixDiv: document.getElementById('adjMatrix'),
    tabs: document.querySelectorAll('.tab-btn'),
    edgeWeightInput: document.getElementById('edgeWeightInput'),
    // Advanced Weighted UI
    weightedModeToggle: document.getElementById('weightedModeToggle'),
    kruskalBtn: document.getElementById('kruskalBtn'),
    primBtn: document.getElementById('primBtn'),
    // Action Buttons
    addUserBtn: document.getElementById('addUserBtn'),
    delUserBtn: document.getElementById('delUserBtn'),
    addConnBtn: document.getElementById('addConnBtn'),
    delConnBtn: document.getElementById('delConnBtn'),
    dfsBtn: document.getElementById('dfsBtn'),
    bfsBtn: document.getElementById('bfsBtn'),
    influencerBtn: document.getElementById('influencerBtn'),
    isolatedBtn: document.getElementById('isolatedBtn'),
    mutualBtn: document.getElementById('mutualBtn'),
    shortestPathBtn: document.getElementById('shortestPathBtn'),
    resetBtn: document.getElementById('resetBtn'),
    sampleDataBtn: document.getElementById('sampleDataBtn')
};

const state = {
    graph: new Graph(),
    positions: new Map(), // Maps node -> {x, y} coordinates
    isAnimating: false,   // Prevents breaking animations mid-way
    isWeightedMode: false,
    weightedEdges: []     // Edge list for Kruskal {from, to, weight}
};

const radiusConfig = {
    base: 220, // Base circle radius for layout
};

// Validates IDs for DOM usage
function sanitizeId(nodeStr) {
    return nodeStr.replace(/[^a-zA-Z0-9_-]/g, '_');
}

// Logging utility
function log(msg, type = 'info') {
    const p = document.createElement('p');
    p.className = `log-message ${type}`;
    p.innerHTML = msg;
    ui.outputLog.appendChild(p);
    ui.outputLog.scrollTop = ui.outputLog.scrollHeight;
}

// Update select dropdowns when nodes change
function updateSelects() {
    const opts = '<option value="">Select User</option>' + state.graph.nodes.map(n => `<option value="${n}">${n}</option>`).join('');
    ui.user1Select.innerHTML = opts;
    ui.user2Select.innerHTML = opts;
    ui.startNodeSelect.innerHTML = opts;
}

// Update the Data Structures View
function updateBackendView() {
    let listStr = "{\n";
    for (let [node, neighbors] of state.graph.adjList.entries()) {
        if (state.isWeightedMode) {
            let nWithW = neighbors.map(n => {
                let wEdge = state.weightedEdges.find(e => (e.from === node && e.to === n) || (e.from === n && e.to === node));
                return `"${n}": ${wEdge ? wEdge.weight : 1}`;
            });
            listStr += `  "${node}": {${nWithW.join(', ')}}\n`;
        } else {
            listStr += `  "${node}": [${neighbors.map(n => `"${n}"`).join(', ')}]\n`;
        }
    }
    listStr += "}";
    ui.adjListDiv.textContent = listStr;

    let matStr = "[\n";
    for (let i = 0; i < state.graph.nodes.length; i++) {
        let rowStr = [];
        for (let j = 0; j < state.graph.nodes.length; j++) {
            let val = state.graph.adjMatrix[i][j];
            if (state.isWeightedMode && val === 1) {
                let n1 = state.graph.nodes[i];
                let n2 = state.graph.nodes[j];
                let wEdge = state.weightedEdges.find(e => (e.from === n1 && e.to === n2) || (e.from === n2 && e.to === n1));
                rowStr.push((wEdge ? wEdge.weight : 1).toString().padStart(3, ' '));
            } else {
                rowStr.push(val.toString().padStart(3, ' '));
            }
        }
        matStr += `  [${rowStr.join(', ')}]\n`;
    }
    matStr += "]";
    ui.adjMatrixDiv.textContent = matStr;
}

// Calculate circle layout for nodes
function recalculatePositions() {
    const container = document.getElementById('graphContainer');
    const width = container.clientWidth;
    const height = container.clientHeight;
    const cx = width / 2;
    const cy = height / 2;
    
    // Scale radius down if container is specifically small
    const r = Math.min(radiusConfig.base, Math.min(width, height) / 2 - 40);
    
    const count = state.graph.nodes.length;
    state.positions.clear();
    
    for (let i = 0; i < count; i++) {
        const node = state.graph.nodes[i];
        // Distribute nodes evenly in a circle, starting from top (-PI/2)
        const angle = (i * 2 * Math.PI) / count - Math.PI / 2;
        const x = cx + r * Math.cos(angle);
        const y = cy + r * Math.sin(angle);
        state.positions.set(node, { x, y });
    }
}

// Draw nodes and edges
function renderGraph() {
    recalculatePositions();
    
    // 1. Render Edges (SVG Lines)
    ui.edgesSvg.innerHTML = '';
    const drawnEdges = new Set();
    
    // First Pass: Draw all lines so they sit underneath the text
    for (let [node, neighbors] of state.graph.adjList.entries()) {
        const pos1 = state.positions.get(node);
        for (let neighbor of neighbors) {
            const sNode = sanitizeId(node);
            const sNeighbor = sanitizeId(neighbor);
            
            const edgeId1 = `edge-${sNode}-${sNeighbor}`;
            const edgeId2 = `edge-${sNeighbor}-${sNode}`;
            
            // Only draw one line for an undirected edge
            if (!drawnEdges.has(edgeId1) && !drawnEdges.has(edgeId2)) {
                const pos2 = state.positions.get(neighbor);
                const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
                line.setAttribute("x1", pos1.x);
                line.setAttribute("y1", pos1.y);
                line.setAttribute("x2", pos2.x);
                line.setAttribute("y2", pos2.y);
                line.setAttribute("class", "graph-edge");
                line.setAttribute("id", edgeId1);
                ui.edgesSvg.appendChild(line);
                drawnEdges.add(edgeId1);
            }
        }
    }

    // Second Pass: Draw Weights (guarantees they are layered on top and bypassing CSS cache)
    if (state.isWeightedMode) {
        const drawnTexts = new Set();
        for (let [node, neighbors] of state.graph.adjList.entries()) {
            const pos1 = state.positions.get(node);
            for (let neighbor of neighbors) {
                const sNode = sanitizeId(node);
                const sNeighbor = sanitizeId(neighbor);
                const textId1 = `text-${sNode}-${sNeighbor}`;
                const textId2 = `text-${sNeighbor}-${sNode}`;
                
                if (!drawnTexts.has(textId1) && !drawnTexts.has(textId2)) {
                    drawnTexts.add(textId1);
                    const pos2 = state.positions.get(neighbor);
                    
                    let wEdge = state.weightedEdges.find(e => 
                        (e.from === node && e.to === neighbor) || 
                        (e.from === neighbor && e.to === node)
                    );
                    
                    if (!wEdge) {
                        wEdge = { from: node, to: neighbor, weight: Math.floor(Math.random() * 10) + 1 };
                        state.weightedEdges.push(wEdge);
                    }
                    
                    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
                    text.setAttribute("x", (pos1.x + pos2.x) / 2);
                    text.setAttribute("y", (pos1.y + pos2.y) / 2 - 5);
                    text.setAttribute("class", "edge-weight");
                    text.setAttribute("text-anchor", "middle");
                    // Force inline styles perfectly in case browser cached the old CSS file
                    text.style.fill = "#ffffff";
                    text.style.fontSize = "14px";
                    text.style.fontWeight = "bold";
                    text.style.textShadow = "0px 0px 5px rgba(0,0,0,1), 0px 0px 8px rgba(0,0,0,0.8)";
                    text.style.pointerEvents = "none";
                    text.textContent = wEdge.weight;
                    ui.edgesSvg.appendChild(text);
                }
            }
        }
    }
    
    // 2. Render Nodes (HTML Divs)
    ui.nodesContainer.innerHTML = '';
    for (let node of state.graph.nodes) {
        const pos = state.positions.get(node);
        const div = document.createElement('div');
        div.className = 'graph-node';
        div.id = `node-${sanitizeId(node)}`;
        
        // Show first 4 characters for compact visual
        div.innerText = node.length > 4 ? node.substring(0, 3) + '.' : node;
        div.style.left = `${pos.x}px`;
        div.style.top = `${pos.y}px`;
        div.setAttribute('data-info', `User: ${node} | Friends: ${state.graph.getDegree(node)}`);
        
        ui.nodesContainer.appendChild(div);
    }
    
    updateBackendView();
}

// Utilities for Animation
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function resetHighlights() {
    document.querySelectorAll('.graph-node').forEach(el => el.classList.remove('visited', 'current'));
    document.querySelectorAll('.graph-edge').forEach(el => el.classList.remove('active', 'kruskal', 'prim'));
    await delay(200);
}

function getEdgeElement(n1, n2) {
    const s1 = sanitizeId(n1);
    const s2 = sanitizeId(n2);
    return document.getElementById(`edge-${s1}-${s2}`) || document.getElementById(`edge-${s2}-${s1}`);
}
function getNodeElement(node) {
    return document.getElementById(`node-${sanitizeId(node)}`);
}

// --- ALGORITHMS ---

// 1. Depth First Search (DFS)
async function runDFS() {
    if (state.isAnimating) return;
    const startNode = ui.startNodeSelect.value;
    if (!startNode) return log('Please select a Start Node first.', 'error');
    
    state.isAnimating = true;
    await resetHighlights();
    log(`Starting <b>DFS</b> traversal from: <b>${startNode}</b>`, 'info');
    
    const visited = new Set();
    const result = [];
    
    async function dfsRecursive(node) {
        visited.add(node);
        result.push(node);
        
        const nodeEl = getNodeElement(node);
        if(nodeEl) nodeEl.classList.add('current');
        log(`Visited: <b>${node}</b>`, 'success');
        await delay(800);
        if(nodeEl) {
            nodeEl.classList.remove('current');
            nodeEl.classList.add('visited');
        }
        
        for (let neighbor of state.graph.getNeighbors(node)) {
            if (!visited.has(neighbor)) {
                const edgeEl = getEdgeElement(node, neighbor);
                if(edgeEl) edgeEl.classList.add('active');
                await delay(400); // Highlight edge brief pause
                await dfsRecursive(neighbor);
            }
        }
    }
    
    await dfsRecursive(startNode);
    log(`<b>DFS Complete!</b><br>Order: ${result.join(' → ')}`, 'success');
    state.isAnimating = false;
}

// 2. Breadth First Search (BFS)
async function runBFS() {
    if (state.isAnimating) return;
    const startNode = ui.startNodeSelect.value;
    if (!startNode) return log('Please select a Start Node first.', 'error');
    
    state.isAnimating = true;
    await resetHighlights();
    log(`Starting <b>BFS</b> traversal from: <b>${startNode}</b>`, 'info');
    
    const visited = new Set();
    const queue = [startNode];
    visited.add(startNode);
    const result = [];
    
    while (queue.length > 0) {
        const node = queue.shift();
        result.push(node);
        
        const nodeEl = getNodeElement(node);
        if(nodeEl) nodeEl.classList.add('current');
        log(`Visited: <b>${node}</b>`, 'success');
        await delay(800);
        
        for (let neighbor of state.graph.getNeighbors(node)) {
            if (!visited.has(neighbor)) {
                visited.add(neighbor);
                queue.push(neighbor);
                
                const edgeEl = getEdgeElement(node, neighbor);
                if(edgeEl) edgeEl.classList.add('active');
                await delay(300);
            }
        }
        
        if(nodeEl) {
            nodeEl.classList.remove('current');
            nodeEl.classList.add('visited');
        }
    }
    
    log(`<b>BFS Complete!</b><br>Order: ${result.join(' → ')}`, 'success');
    state.isAnimating = false;
}

// 3. Find Influencers (Highest Degree Nodes in Adjacency List)
function findInfluencer() {
    if (state.graph.nodes.length === 0) return log('Graph is empty.', 'error');
    let maxDegree = -1;
    
    // First, find the maximum degree in the graph
    for (let node of state.graph.nodes) {
        const degree = state.graph.getDegree(node);
        if (degree > maxDegree) {
            maxDegree = degree;
        }
    }
    
    // Collect all nodes that have this maximum degree
    const influencers = state.graph.nodes.filter(n => state.graph.getDegree(n) === maxDegree);
    
    const label = influencers.length > 1 ? 'Leaders Found' : 'Leader Found';
    log(`🌟 <b>${label}:</b> ${influencers.join(', ')} with ${maxDegree} connections!`, 'success');
    
    resetHighlights().then(() => {
        influencers.forEach(influencer => {
            const el = getNodeElement(influencer);
            if(el) el.classList.add('current');
        });
    });
}

// 4. Find Isolated Users (Degree = 0)
function findIsolated() {
    if (state.graph.nodes.length === 0) return log('Graph is empty.', 'error');
    const isolated = state.graph.nodes.filter(n => state.graph.getDegree(n) === 0);
    
    resetHighlights().then(() => {
        if (isolated.length === 0) {
            log('No isolated users found. Everyone is connected!', 'info');
        } else {
            log(`👻 <b>Isolated Users:</b> ${isolated.join(', ')}`, 'warning');
            isolated.forEach(n => {
                const el = getNodeElement(n);
                if(el) el.classList.add('visited');
            });
        }
    });
}

// 5. Find Mutual Friends (Intersection of two adjacency lists)
function findMutualConnections() {
    const user1 = ui.user1Select.value;
    const user2 = ui.user2Select.value;
    
    if (!user1 || !user2 || user1 === user2) {
        return log('Select two different users from Add Connection dropdowns.', 'error');
    }
    
    const n1 = new Set(state.graph.getNeighbors(user1));
    const n2 = state.graph.getNeighbors(user2);
    // Find intersection
    const mutual = n2.filter(n => n1.has(n));
    
    resetHighlights().then(() => {
        if (mutual.length > 0) {
            log(`🤝 <b>Mutual Connections between ${user1} & ${user2}:</b> ${mutual.join(', ')}`, 'success');
            // Highlight nodes representing mutual friends
            mutual.forEach(n => {
                const el = getNodeElement(n);
                if(el) el.classList.add('current');
            });
        } else {
            log(`No mutual connections found between ${user1} and ${user2}.`, 'info');
        }
    });
}

// 6. Application of BFS: Shortest Path between two nodes
async function findShortestPath() {
    if (state.isAnimating) return;
    const user1 = ui.user1Select.value;
    const user2 = ui.user2Select.value;
    
    if (!user1 || !user2 || user1 === user2) {
        return log('Select two different users from Add Connection dropdowns.', 'error');
    }
    
    state.isAnimating = true;
    await resetHighlights();
    log(`Calculating shortest path from <b>${user1}</b> to <b>${user2}</b>...`, 'info');
    
    // Queue stores paths (arrays of nodes) instead of just nodes
    const queue = [[user1]];
    const visited = new Set([user1]);
    let pathFound = null;
    
    while (queue.length > 0) {
        const path = queue.shift();
        const node = path[path.length - 1]; // Current tail node
        
        if (node === user2) {
            pathFound = path;
            break;
        }
        
        for (let neighbor of state.graph.getNeighbors(node)) {
            if (!visited.has(neighbor)) {
                visited.add(neighbor);
                queue.push([...path, neighbor]);
            }
        }
    }
    
    if (pathFound) {
        log(`🛣️ <b>Shortest Path:</b> ${pathFound.join(' → ')} (Distance: ${pathFound.length - 1})`, 'success');
        // Animate path step-by-step
        for (let i = 0; i < pathFound.length; i++) {
            const node = pathFound[i];
            const nodeEl = getNodeElement(node);
            if(nodeEl) nodeEl.classList.add('current');
            
            if (i > 0) {
                const prevNode = pathFound[i-1];
                const edgeEl = getEdgeElement(prevNode, node);
                if(edgeEl) edgeEl.classList.add('active');
            }
            await delay(600);
            
            if(nodeEl) {
                nodeEl.classList.remove('current');
                nodeEl.classList.add('visited');
            }
        }
    } else {
        log(`No path exists between <b>${user1}</b> and <b>${user2}</b>.`, 'warning');
    }
    state.isAnimating = false;
}

// --- EVENT LISTENERS ---

ui.addUserBtn.addEventListener('click', () => {
    const name = ui.usernameInput.value.trim();
    if (!name) return log('Enter a valid username.', 'error');
    
    if (state.graph.addNode(name)) {
        ui.usernameInput.value = '';
        updateSelects();
        renderGraph();
        log(`Added user: <b>${name}</b>`, 'success');
    } else {
        log(`Failed! Either user exists or Graph is full (Max 10).`, 'error');
    }
});

ui.delUserBtn.addEventListener('click', () => {
    const name = ui.usernameInput.value.trim();
    if (!name) return log('Enter a valid username to delete.', 'error');
    
    if (state.graph.removeNode(name)) {
        ui.usernameInput.value = '';
        updateSelects();
        renderGraph();
        log(`Deleted user: <b>${name}</b>`, 'success');
    } else {
        log(`Failed! User does not exist.`, 'error');
    }
});

ui.addConnBtn.addEventListener('click', () => {
    const u1 = ui.user1Select.value;
    const u2 = ui.user2Select.value;
    const wVal = parseInt(ui.edgeWeightInput.value);
    
    if (!u1 || !u2) return log('Select two users to connect.', 'error');
    if (u1 === u2) return log('A user cannot connect to themselves.', 'error');
    
    const isNew = state.graph.addEdge(u1, u2);
    
    if (isNew) {
        if (!isNaN(wVal)) {
            state.weightedEdges.push({ from: u1, to: u2, weight: wVal });
            if (!state.isWeightedMode) {
                state.isWeightedMode = true;
                ui.weightedModeToggle.checked = true;
                generateWeights();
            }
        } else if (state.isWeightedMode) {
            state.weightedEdges.push({ from: u1, to: u2, weight: Math.floor(Math.random() * 10) + 1 });
        }
        renderGraph();
        log(`Connection created: <b>${u1} ↔ ${u2}</b> ${!isNaN(wVal) ? `(Weight: ${wVal})` : ''}`, 'success');
        ui.edgeWeightInput.value = '';
    } else {
        if (!isNaN(wVal)) {
            let existingW = state.weightedEdges.find(e => (e.from === u1 && e.to === u2) || (e.from === u2 && e.to === u1));
            if (existingW) {
                existingW.weight = wVal;
            } else {
                state.weightedEdges.push({ from: u1, to: u2, weight: wVal });
            }
            if (!state.isWeightedMode) {
                state.isWeightedMode = true;
                ui.weightedModeToggle.checked = true;
                generateWeights();
            }
            renderGraph();
            log(`Weight updated: <b>${u1} ↔ ${u2}</b> to ${wVal}`, 'success');
            ui.edgeWeightInput.value = '';
        } else {
            log(`Connection already exists.`, 'warning');
        }
    }
});

ui.delConnBtn.addEventListener('click', () => {
    const u1 = ui.user1Select.value;
    const u2 = ui.user2Select.value;
    if (!u1 || !u2) return log('Select two users to disconnect.', 'error');
    if (u1 === u2) return log('A user cannot disconnect from themselves.', 'error');
    
    if (state.graph.removeEdge(u1, u2)) {
        renderGraph();
        log(`Connection removed: <b>${u1} ↔ ${u2}</b>`, 'success');
    } else {
        log(`Connection does not exist.`, 'warning');
    }
});

ui.dfsBtn.addEventListener('click', runDFS);
ui.bfsBtn.addEventListener('click', runBFS);
ui.influencerBtn.addEventListener('click', findInfluencer);
ui.isolatedBtn.addEventListener('click', findIsolated);
ui.mutualBtn.addEventListener('click', findMutualConnections);
ui.shortestPathBtn.addEventListener('click', findShortestPath);

ui.resetBtn.addEventListener('click', () => {
    if (state.isAnimating) return log('Please wait for animation to finish.', 'warning');
    state.graph = new Graph();
    updateSelects();
    renderGraph();
    ui.outputLog.innerHTML = '<p class="log-message info">Graph reset successfully to empty state.</p>';
});

// Provides test data right away
ui.sampleDataBtn.addEventListener('click', () => {
    if (state.isAnimating) return log('Please wait for animation to finish.', 'warning');
    state.graph = new Graph();
    state.weightedEdges = [];
    const mockUsers = ['travel_vibe', 'photo_guy', 'foodie_q', 'fit_life99', 'artby_sam', 'tech_guru', 'daily_meme'];
    mockUsers.forEach(u => state.graph.addNode(u));
    
    state.graph.addEdge('travel_vibe', 'photo_guy');
    state.graph.addEdge('travel_vibe', 'foodie_q');
    state.graph.addEdge('photo_guy', 'fit_life99');
    state.graph.addEdge('photo_guy', 'artby_sam');
    state.graph.addEdge('foodie_q', 'artby_sam');
    state.graph.addEdge('artby_sam', 'tech_guru');
    // daily_meme remains isolated intentionally
    
    updateSelects();
    renderGraph();
    log('Sample Network Loaded! Try running Shortest Path or find Isolated.', 'success');
});

// Tab Switching
ui.tabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
        ui.tabs.forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.data-view').forEach(v => v.classList.remove('active'));
        
        e.target.classList.add('active');
        document.getElementById(e.target.dataset.tab).classList.add('active');
    });
});

// Handle window resize dynamically to correct paths
window.addEventListener('resize', () => {
    if (state.graph.nodes.length > 0) renderGraph();
});

// --- ADVANCED WEIGHTED ALGORITHMS ---

function generateWeights() {
    const existingEdges = [...state.weightedEdges];
    state.weightedEdges = [];
    const seen = new Set();
    
    for (let [node, neighbors] of state.graph.adjList.entries()) {
        for (let neighbor of neighbors) {
            const edgeId1 = `${node}-${neighbor}`;
            const edgeId2 = `${neighbor}-${node}`;
            if (!seen.has(edgeId1) && !seen.has(edgeId2)) {
                seen.add(edgeId1);
                
                const existing = existingEdges.find(e => (e.from === node && e.to === neighbor) || (e.from === neighbor && e.to === node));
                if (existing) {
                    state.weightedEdges.push(existing);
                } else {
                    state.weightedEdges.push({ 
                        from: node, 
                        to: neighbor, 
                        weight: Math.floor(Math.random() * 10) + 1 
                    });
                }
            }
        }
    }
}

ui.weightedModeToggle.addEventListener('change', (e) => {
    state.isWeightedMode = e.target.checked;
    if (state.isWeightedMode) {
        generateWeights(); // generate simulated strengths
        log('<b>Weighted Mode Enabled:</b> Edges now have interaction strength.', 'info');
    } else {
        log('<b>Weighted Mode Disabled.</b> Graph operates implicitly equally weighted.', 'info');
    }
    renderGraph();
});

class UnionFind {
    constructor(nodes) {
        this.parent = {};
        nodes.forEach(n => this.parent[n] = n);
    }
    find(i) {
        if (this.parent[i] === i) return i;
        return this.parent[i] = this.find(this.parent[i]);
    }
    union(i, j) {
        let rootI = this.find(i);
        let rootJ = this.find(j);
        if (rootI !== rootJ) {
            this.parent[rootI] = rootJ;
            return true;
        }
        return false;
    }
}

ui.kruskalBtn.addEventListener('click', async () => {
    if (!state.isWeightedMode) return log('❌ Enable Weighted Mode first to run Kruskal.', 'error');
    if (state.graph.nodes.length === 0) return log('Graph is empty.', 'error');
    if (state.isAnimating) return;
    
    state.isAnimating = true;
    await resetHighlights();
    log(`Starting <b>Kruskal\'s MST</b>...`, 'info');
    
    let edges = [...state.weightedEdges].sort((a, b) => a.weight - b.weight);
    let uf = new UnionFind(state.graph.nodes);
    
    let totalCost = 0;
    for (let edge of edges) {
        if (uf.union(edge.from, edge.to)) {
            totalCost += edge.weight;
            const edgeEl = getEdgeElement(edge.from, edge.to);
            if (edgeEl) edgeEl.classList.add('kruskal');
            
            log(`Added line: <b>${edge.from} ↔ ${edge.to}</b> (Weight: ${edge.weight})`, 'success');
            await delay(600);
        }
    }
    log(`🌲 <b>Kruskal MST Complete!</b> Total Cost: ${totalCost}`, 'success');
    state.isAnimating = false;
});

ui.primBtn.addEventListener('click', async () => {
    if (!state.isWeightedMode) return log('❌ Enable Weighted Mode first to run Prim.', 'error');
    if (state.graph.nodes.length === 0) return log('Graph is empty.', 'error');
    if (state.isAnimating) return;
    
    let startNode = ui.startNodeSelect.value || state.graph.nodes[0];
    state.isAnimating = true;
    await resetHighlights();
    log(`Starting <b>Prim\'s MST</b> from node <b>${startNode}</b>...`, 'info');
    
    let visited = new Set([startNode]);
    let totalCost = 0;
    
    const nodeEl = getNodeElement(startNode);
    if(nodeEl) nodeEl.classList.add('visited');
    
    while (visited.size < state.graph.nodes.length) {
        let minEdge = null;
        for (let edge of state.weightedEdges) {
            let hasFrom = visited.has(edge.from);
            let hasTo = visited.has(edge.to);
            if (hasFrom !== hasTo) {
                if (!minEdge || edge.weight < minEdge.weight) {
                    minEdge = edge;
                }
            }
        }
        
        if (!minEdge) break; // Graph disconnected handling
        
        let newNode = visited.has(minEdge.from) ? minEdge.to : minEdge.from;
        visited.add(newNode);
        totalCost += minEdge.weight;
        
        const edgeEl = getEdgeElement(minEdge.from, minEdge.to);
        if (edgeEl) edgeEl.classList.add('prim');
        
        const nEl = getNodeElement(newNode);
        if (nEl) nEl.classList.add('visited');
        
        log(`Added line: <b>${minEdge.from} ↔ ${minEdge.to}</b> (Weight: ${minEdge.weight})`, 'success');
        await delay(600);
    }
    log(`🌲 <b>Prim MST Complete!</b> Total Cost: ${totalCost}`, 'success');
    state.isAnimating = false;
});
