const canvas = document.getElementById('heroCanvas');
const ctx = canvas.getContext('2d');

let width, height;
let fov = 300; 

let mouseX = 0;
let mouseY = 0;
let targetMouseX = 0;
let targetMouseY = 0;

function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
    fov = width * 0.8;
}

window.addEventListener('resize', resize);
resize();

window.addEventListener('mousemove', (e) => {
    targetMouseX = (e.clientX / width) * 2 - 1;
    targetMouseY = (e.clientY / height) * 2 - 1;
});

function project(x, y, z) {
    const px = x - mouseX * z * 0.15;
    const py = y - mouseY * z * 0.15;
    const scale = z > 0 ? fov / z : 0;
    return {
        x: width / 2 + px * scale,
        y: height / 2 + py * scale,
        scale: scale
    };
}

// 3D Engine Parameters
const depth = 4000;

// Grid parameters
let gridOffsetZ = 0;
const gridSpeed = 2;
const gridSpacing = 150;

// Node parameters
const nodes = [];
const numNodes = 120;
for(let i=0; i<numNodes; i++) {
    nodes.push({
        x: (Math.random() - 0.5) * 4000,
        y: (Math.random() - 0.5) * 3000,
        z: Math.random() * depth,
        vx: (Math.random() - 0.5) * 1,
        vy: (Math.random() - 0.5) * 1,
        vz: - (Math.random() * 2 + 1), 
        size: Math.random() * 2 + 1,
        baseAlpha: Math.random() * 0.6 + 0.2
    });
}

// Frame parameters (recursive tunnel)
const frames = [];
const numFrames = 8;
const frameSpeed = 3;
for(let i=0; i<numFrames; i++) {
    frames.push({
        z: (i / numFrames) * depth
    });
}

function drawGrid() {
    gridOffsetZ = (gridOffsetZ + gridSpeed) % gridSpacing;
    
    // Top and Bottom grid logic
    const planes = [
        { y: 400, colorTop: 'rgba(0, 150, 255, ', colorBot: 'rgba(0, 150, 255, ', alphaMult: 0.5, type: 'floor' },
        { y: -400, colorTop: 'rgba(0, 100, 200, ', colorBot: 'rgba(0, 100, 200, ', alphaMult: 0.3, type: 'ceil' }
    ];

    ctx.lineWidth = 1;

    for (const plane of planes) {
        // Horizontal lines (moving forward)
        for(let z = gridOffsetZ; z < depth; z += gridSpacing) {
            let p1 = project(-4000, plane.y, z);
            let p2 = project(4000, plane.y, z);
            if (p1.scale <= 0) continue;
            
            let alpha = Math.max(0, 1 - (z / depth)) * plane.alphaMult;
            let pulse = Math.sin(Date.now() * 0.002 + z * 0.01) * 0.1; // Soft glowing pulse
            
            ctx.strokeStyle = `${plane.colorTop}${alpha + pulse})`;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
        }
        
        // Vertical lines (infinite perspective)
        for(let x = -4000; x <= 4000; x += gridSpacing) {
             let p1 = project(x, plane.y, 10);
             let p2 = project(x, plane.y, depth);
             if (p1.scale > 0 && p2.scale > 0) {
                  const grad = ctx.createLinearGradient(p1.x, p1.y, p2.x, p2.y);
                  let pulseY = (Math.sin(Date.now() * 0.001 + Math.abs(x) * 0.01) * 0.1 + 0.5) * plane.alphaMult * 2;
                  grad.addColorStop(0, `${plane.colorTop}${pulseY})`);
                  grad.addColorStop(1, `${plane.colorBot}0)`);
                  ctx.strokeStyle = grad;
                  ctx.beginPath();
                  ctx.moveTo(p1.x, p1.y);
                  ctx.lineTo(p2.x, p2.y);
                  ctx.stroke();
             }
        }
    }
}

function drawNodes() {
    // 1. Update positions
    for(let i=0; i<nodes.length; i++) {
        let n = nodes[i];
        n.x += n.vx;
        n.y += n.vy;
        n.z += n.vz;
        
        // Loop bounds
        if (n.z < 10) n.z += depth;
        if (n.x < -2000) n.x += 4000;
        if (n.x > 2000) n.x -= 4000;
        if (n.y < -1500) n.y += 3000;
        if (n.y > 1500) n.y -= 3000;
    }
    
    // 2. Draw connections first (behind nodes)
    ctx.lineWidth = 0.5;
    for(let i=0; i<nodes.length; i++) {
        for(let j=i+1; j<nodes.length; j++) {
            let ni = nodes[i];
            let nj = nodes[j];
            let dx = ni.x - nj.x;
            let dy = ni.y - nj.y;
            let dz = ni.z - nj.z;
            let distSq = dx*dx + dy*dy + dz*dz;
            
            // Connect close nodes
            if (distSq < 150000) { 
                let pi = project(ni.x, ni.y, ni.z);
                let pj = project(nj.x, nj.y, nj.z);
                if (pi.scale > 0 && pj.scale > 0) {
                    let alpha = 1 - Math.sqrt(distSq)/387.29; // ~sqrt(150000)
                    let depthAlpha = Math.max(0, 1 - (ni.z / depth));
                    ctx.strokeStyle = `rgba(0, 255, 255, ${alpha * depthAlpha * 0.4})`;
                    ctx.beginPath();
                    ctx.moveTo(pi.x, pi.y);
                    ctx.lineTo(pj.x, pj.y);
                    ctx.stroke();
                }
            }
        }
    }
    
    // 3. Draw nodes
    for(let n of nodes) {
        let p = project(n.x, n.y, n.z);
        if (p.scale > 0) {
            let depthAlpha = Math.max(0, 1 - (n.z / depth));
            let r = n.size * p.scale;
            
            // Soft blink effect mapped to time and position
            let blink = (Math.sin(Date.now() * 0.005 + n.x) + 1) * 0.5;
            let a = n.baseAlpha * depthAlpha * (0.5 + blink * 0.5);
            
            ctx.fillStyle = `rgba(0, 255, 255, ${a})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, Math.max(0.1, r), 0, Math.PI*2);
            ctx.fill();
            
            // Glow effect
            if (p.scale > 0.5) {
                ctx.shadowColor = '#00ffff';
                ctx.shadowBlur = 10 * p.scale;
                ctx.fill();
                ctx.shadowBlur = 0; 
            }
        }
    }
}

function drawFrames() {
    ctx.lineWidth = 1;
    for(let f of frames) {
        f.z -= frameSpeed;
        if (f.z < 10) f.z += depth;
        
        let sWidth = 800;  // Base width of the frame
        let sHeight = 500; // Base height of the frame
        
        // 4 corners of the square
        let p1 = project(-sWidth, -sHeight, f.z);
        let p2 = project(sWidth, -sHeight, f.z);
        let p3 = project(sWidth, sHeight, f.z);
        let p4 = project(-sWidth, sHeight, f.z);
        
        if (p1.scale > 0 && p2.scale > 0 && p3.scale > 0 && p4.scale > 0) {
            let alpha = Math.max(0, 1 - (f.z / depth)) * 0.15; // Very dim, subtle framing
            ctx.strokeStyle = `rgba(0, 255, 255, ${alpha})`;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.lineTo(p3.x, p3.y);
            ctx.lineTo(p4.x, p4.y);
            ctx.closePath();
            ctx.stroke();
        }
    }
}

function animate() {
    // Clear canvas with base background to prevent trails
    ctx.clearRect(0, 0, width, height);
    
    // Smooth mouse follow (easing)
    mouseX += (targetMouseX - mouseX) * 0.05;
    mouseY += (targetMouseY - mouseY) * 0.05;
    
    // Draw elements
    drawGrid();     // Floor and ceiling
    drawFrames();   // Inward tunnel frames
    drawNodes();    // Neural network
    
    requestAnimationFrame(animate);
}

// Start animation loop
animate();
