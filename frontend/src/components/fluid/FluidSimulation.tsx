import React, { useEffect, useRef } from 'react';

/**
 * WebGL Navier-Stokes Fluid Simulation
 * Based on the Pavel Dobryakov fluid simulation approach with exact Flowstate specifications:
 * - SIM_RESOLUTION: 200
 * - DYE_RESOLUTION: 512
 * - DENSITY_DISSIPATION: 0.958
 * - VELOCITY_DISSIPATION: 0.96
 * - PRESSURE_DISSIPATION: 0.8
 * - PRESSURE_ITERATIONS: 20
 * - CURL: 42
 * - SPLAT_RADIUS: 0.22
 * - SHADING: true
 * - COLORFUL: true
 * - BLOOM: false
 * - Background RGB: (4, 5, 12) = #04050c
 * - Entrance burst: multipleSplats(34)
 * - Follow-up waves: 8 rapid waves (splatStack.push(10 + Math.random() * 10))
 * - Automatic invisible cursor: ORBIT_RADIUS = 300, ORBIT_SPEED = 0.026, ORBIT_START_DELAY = 700ms
 * - Breathing orbit: 0.72 + 0.28 * Math.sin(orbitAngle * 0.37)
 * - Color generation: hue = 0.5 + Math.random() * 0.42, sat = 0.95, val = 1.0
 */

// Helper to convert HSV to RGB
function HSVtoRGB(h: number, s: number, v: number): { r: number; g: number; b: number } {
  let r = 0, g = 0, b = 0;
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  switch (i % 6) {
    case 0: r = v; g = t; b = p; break;
    case 1: r = q; g = v; b = p; break;
    case 2: r = p; g = v; b = t; break;
    case 3: r = p; g = q; b = v; break;
    case 4: r = t; g = p; b = v; break;
    case 5: r = v; g = p; b = q; break;
  }
  return { r, g, b };
}

// Generate Flowstate cyan -> blue -> violet -> magenta color
function generateFlowstateColor(): { r: number; g: number; b: number } {
  const hue = 0.5 + Math.random() * 0.42; // [0.5, 0.92]
  const sat = 0.95;
  const val = 1.0;
  const rgb = HSVtoRGB(hue, sat, val);
  return {
    r: rgb.r * 0.22, // scale down slightly for deep vibrant dye mixing
    g: rgb.g * 0.22,
    b: rgb.b * 0.22,
  };
}

export const FluidSimulation: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Simulation config
    const config = {
      SIM_RESOLUTION: 200,
      DYE_RESOLUTION: 512,
      DENSITY_DISSIPATION: 0.958,
      VELOCITY_DISSIPATION: 0.96,
      PRESSURE_DISSIPATION: 0.8,
      PRESSURE_ITERATIONS: 20,
      CURL: 42,
      SPLAT_RADIUS: 0.22,
      SHADING: true,
      COLORFUL: true,
      BLOOM: false,
      BACK_COLOR: { r: 4 / 255, g: 5 / 255, b: 12 / 255 },
      ORBIT_RADIUS: 300,
      ORBIT_SPEED: 0.026,
      ORBIT_START_DELAY: 700,
    };

    // Get WebGL context (WebGL2 preferred, fallback to WebGL1)
    const params = {
      alpha: true,
      depth: false,
      stencil: false,
      antialias: false,
      preserveDrawingBuffer: false,
    };
    let gl = (canvas.getContext('webgl2', params) ||
      canvas.getContext('webgl', params) ||
      canvas.getContext('experimental-webgl', params)) as WebGLRenderingContext | WebGL2RenderingContext | null;

    if (!gl) {
      console.warn('WebGL not supported. Fallback to CSS background.');
      return;
    }

    const isWebGL2 = 'drawBuffers' in gl;
    let extHalfFloat: any = null;
    let extLinear: any = null;

    if (isWebGL2) {
      const gl2 = gl as WebGL2RenderingContext;
      gl2.getExtension('EXT_color_buffer_float');
      extLinear = gl2.getExtension('OES_texture_float_linear');
    } else {
      extHalfFloat = gl.getExtension('OES_texture_half_float');
      gl.getExtension('OES_texture_half_float_linear');
    }

    // Determine texture format
    let internalFormat: number;
    let format: number;
    let type: number;

    if (isWebGL2) {
      const gl2 = gl as WebGL2RenderingContext;
      internalFormat = gl2.RGBA16F;
      format = gl2.RGBA;
      type = gl2.HALF_FLOAT;
    } else {
      internalFormat = gl.RGBA;
      format = gl.RGBA;
      type = extHalfFloat ? extHalfFloat.HALF_FLOAT_OES : gl.UNSIGNED_BYTE;
    }

    // Compile shader program helper
    function createProgram(vertexSource: string, fragmentSource: string): WebGLProgram | null {
      if (!gl) return null;
      const vShader = gl.createShader(gl.VERTEX_SHADER)!;
      gl.shaderSource(vShader, vertexSource);
      gl.compileShader(vShader);
      if (!gl.getShaderParameter(vShader, gl.COMPILE_STATUS)) {
        console.error('Vertex shader error:', gl.getShaderInfoLog(vShader));
        gl.deleteShader(vShader);
        return null;
      }

      const fShader = gl.createShader(gl.FRAGMENT_SHADER)!;
      gl.shaderSource(fShader, fragmentSource);
      gl.compileShader(fShader);
      if (!gl.getShaderParameter(fShader, gl.COMPILE_STATUS)) {
        console.error('Fragment shader error:', gl.getShaderInfoLog(fShader));
        gl.deleteShader(vShader);
        gl.deleteShader(fShader);
        return null;
      }

      const program = gl.createProgram()!;
      gl.attachShader(program, vShader);
      gl.attachShader(program, fShader);
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('Program link error:', gl.getProgramInfoLog(program));
        return null;
      }
      return program;
    }

    // Common vertex shader for full-screen quad
    const baseVertexShader = `
      precision highp float;
      attribute vec2 aPosition;
      varying vec2 vUv;
      varying vec2 vL;
      varying vec2 vR;
      varying vec2 vT;
      varying vec2 vB;
      uniform vec2 texelSize;

      void main () {
        vUv = aPosition * 0.5 + 0.5;
        vL = vUv - vec2(texelSize.x, 0.0);
        vR = vUv + vec2(texelSize.x, 0.0);
        vT = vUv + vec2(0.0, texelSize.y);
        vB = vUv - vec2(0.0, texelSize.y);
        gl_Position = vec4(aPosition, 0.0, 1.0);
      }
    `;

    // Shaders
    const clearShaderSource = `
      precision mediump float;
      precision mediump sampler2D;
      varying highp vec2 vUv;
      uniform sampler2D uTexture;
      uniform float value;
      void main () {
        gl_FragColor = value * texture2D(uTexture, vUv);
      }
    `;

    const splatShaderSource = `
      precision highp float;
      precision highp sampler2D;
      varying vec2 vUv;
      uniform sampler2D uTarget;
      uniform float aspectRatio;
      uniform vec3 color;
      uniform vec2 point;
      uniform float radius;

      void main () {
        vec2 p = vUv - point.xy;
        p.x *= aspectRatio;
        vec3 splat = exp(-dot(p, p) / radius) * color;
        vec3 base = texture2D(uTarget, vUv).xyz;
        gl_FragColor = vec4(base + splat, 1.0);
      }
    `;

    const advectionShaderSource = `
      precision highp float;
      precision highp sampler2D;
      varying vec2 vUv;
      uniform sampler2D uVelocity;
      uniform sampler2D uSource;
      uniform vec2 texelSize;
      uniform float dt;
      uniform float dissipation;

      void main () {
        vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * texelSize;
        gl_FragColor = dissipation * texture2D(uSource, coord);
      }
    `;

    const divergenceShaderSource = `
      precision mediump float;
      precision mediump sampler2D;
      varying highp vec2 vL;
      varying highp vec2 vR;
      varying highp vec2 vT;
      varying highp vec2 vB;
      uniform sampler2D uVelocity;

      void main () {
        float L = texture2D(uVelocity, vL).x;
        float R = texture2D(uVelocity, vR).x;
        float T = texture2D(uVelocity, vT).y;
        float B = texture2D(uVelocity, vB).y;
        float div = 0.5 * (R - L + T - B);
        gl_FragColor = vec4(div, 0.0, 0.0, 1.0);
      }
    `;

    const curlShaderSource = `
      precision mediump float;
      precision mediump sampler2D;
      varying highp vec2 vL;
      varying highp vec2 vR;
      varying highp vec2 vT;
      varying highp vec2 vB;
      uniform sampler2D uVelocity;

      void main () {
        float L = texture2D(uVelocity, vL).y;
        float R = texture2D(uVelocity, vR).y;
        float T = texture2D(uVelocity, vT).x;
        float B = texture2D(uVelocity, vB).x;
        float vorticity = R - L - T + B;
        gl_FragColor = vec4(0.5 * vorticity, 0.0, 0.0, 1.0);
      }
    `;

    const vorticityShaderSource = `
      precision highp float;
      precision highp sampler2D;
      varying vec2 vUv;
      varying vec2 vL;
      varying vec2 vR;
      varying vec2 vT;
      varying vec2 vB;
      uniform sampler2D uVelocity;
      uniform sampler2D uCurl;
      uniform float curl;
      uniform float dt;

      void main () {
        float L = texture2D(uCurl, vL).x;
        float R = texture2D(uCurl, vR).x;
        float T = texture2D(uCurl, vT).x;
        float B = texture2D(uCurl, vB).x;
        float C = texture2D(uCurl, vUv).x;

        vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
        force /= length(force) + 0.0001;
        force *= curl * C;
        force.y *= -1.0;

        vec2 vel = texture2D(uVelocity, vUv).xy;
        gl_FragColor = vec4(vel + force * dt, 0.0, 1.0);
      }
    `;

    const pressureShaderSource = `
      precision mediump float;
      precision mediump sampler2D;
      varying highp vec2 vUv;
      varying highp vec2 vL;
      varying highp vec2 vR;
      varying highp vec2 vT;
      varying highp vec2 vB;
      uniform sampler2D uPressure;
      uniform sampler2D uDivergence;

      void main () {
        float L = texture2D(uPressure, vL).x;
        float R = texture2D(uPressure, vR).x;
        float T = texture2D(uPressure, vT).x;
        float B = texture2D(uPressure, vB).x;
        float C = texture2D(uDivergence, vUv).x;
        float pressure = (L + R + B + T - C) * 0.25;
        gl_FragColor = vec4(pressure, 0.0, 0.0, 1.0);
      }
    `;

    const gradientSubtractShaderSource = `
      precision mediump float;
      precision mediump sampler2D;
      varying highp vec2 vUv;
      varying highp vec2 vL;
      varying highp vec2 vR;
      varying highp vec2 vT;
      varying highp vec2 vB;
      uniform sampler2D uPressure;
      uniform sampler2D uVelocity;

      void main () {
        float L = texture2D(uPressure, vL).x;
        float R = texture2D(uPressure, vR).x;
        float T = texture2D(uPressure, vT).x;
        float B = texture2D(uPressure, vB).x;
        vec2 velocity = texture2D(uVelocity, vUv).xy;
        velocity.xy -= vec2(R - L, T - B) * 0.5;
        gl_FragColor = vec4(velocity, 0.0, 1.0);
      }
    `;

    const displayShaderSource = `
      precision highp float;
      precision highp sampler2D;
      varying vec2 vUv;
      varying vec2 vL;
      varying vec2 vR;
      varying vec2 vT;
      varying vec2 vB;
      uniform sampler2D uTexture;
      uniform vec3 backColor;

      void main () {
        vec3 color = texture2D(uTexture, vUv).rgb;

        // Shading: compute surface normal from color gradients for ink-in-water marbling
        vec3 lc = texture2D(uTexture, vL).rgb;
        vec3 rc = texture2D(uTexture, vR).rgb;
        vec3 tc = texture2D(uTexture, vT).rgb;
        vec3 bc = texture2D(uTexture, vB).rgb;

        float dx = length(rc) - length(lc);
        float dy = length(tc) - length(bc);
        vec3 n = normalize(vec3(dx, dy, 0.15));

        vec3 l = normalize(vec3(0.1, 0.2, 0.97));
        float diffuse = clamp(dot(n, l) * 0.7 + 0.3, 0.0, 1.0);

        color = color * diffuse;
        gl_FragColor = vec4(backColor + color, 1.0);
      }
    `;

    // Create shader programs
    const clearProgram = createProgram(baseVertexShader, clearShaderSource)!;
    const splatProgram = createProgram(baseVertexShader, splatShaderSource)!;
    const advectionProgram = createProgram(baseVertexShader, advectionShaderSource)!;
    const divergenceProgram = createProgram(baseVertexShader, divergenceShaderSource)!;
    const curlProgram = createProgram(baseVertexShader, curlShaderSource)!;
    const vorticityProgram = createProgram(baseVertexShader, vorticityShaderSource)!;
    const pressureProgram = createProgram(baseVertexShader, pressureShaderSource)!;
    const gradientSubtractProgram = createProgram(baseVertexShader, gradientSubtractShaderSource)!;
    const displayProgram = createProgram(baseVertexShader, displayShaderSource)!;

    // Fullscreen quad buffer
    const quadBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]),
      gl.STATIC_DRAW
    );

    function bindQuad(program: WebGLProgram) {
      if (!gl) return;
      gl.useProgram(program);
      const posLoc = gl.getAttribLocation(program, 'aPosition');
      gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
      gl.enableVertexAttribArray(posLoc);
      gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
    }

    // FBO creation helpers
    interface FBO {
      texture: WebGLTexture;
      fbo: WebGLFramebuffer;
      width: number;
      height: number;
      texelSizeX: number;
      texelSizeY: number;
      attach: (id: number) => number;
    }

    interface DoubleFBO {
      width: number;
      height: number;
      texelSizeX: number;
      texelSizeY: number;
      read: FBO;
      write: FBO;
      swap: () => void;
    }

    function createFBO(w: number, h: number): FBO {
      if (!gl) throw new Error('No GL');
      gl.activeTexture(gl.TEXTURE0);
      const texture = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, w, h, 0, format, type, null);

      const fbo = gl.createFramebuffer()!;
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
      gl.viewport(0, 0, w, h);
      gl.clear(gl.COLOR_BUFFER_BIT);

      return {
        texture,
        fbo,
        width: w,
        height: h,
        texelSizeX: 1 / w,
        texelSizeY: 1 / h,
        attach: (id: number) => {
          gl!.activeTexture(gl!.TEXTURE0 + id);
          gl!.bindTexture(gl!.TEXTURE_2D, texture);
          return id;
        },
      };
    }

    function createDoubleFBO(w: number, h: number): DoubleFBO {
      let fbo1 = createFBO(w, h);
      let fbo2 = createFBO(w, h);
      return {
        width: w,
        height: h,
        texelSizeX: fbo1.texelSizeX,
        texelSizeY: fbo1.texelSizeY,
        get read() { return fbo1; },
        set read(val) { fbo1 = val; },
        get write() { return fbo2; },
        set write(val) { fbo2 = val; },
        swap() {
          const temp = fbo1;
          fbo1 = fbo2;
          fbo2 = temp;
        },
      };
    }

    let density: DoubleFBO;
    let velocity: DoubleFBO;
    let divergence: FBO;
    let curl: FBO;
    let pressure: DoubleFBO;

    function initFBOs() {
      const simRes = config.SIM_RESOLUTION;
      const dyeRes = config.DYE_RESOLUTION;
      density = createDoubleFBO(dyeRes, dyeRes);
      velocity = createDoubleFBO(simRes, simRes);
      divergence = createFBO(simRes, simRes);
      curl = createFBO(simRes, simRes);
      pressure = createDoubleFBO(simRes, simRes);
    }

    initFBOs();

    // Splat helper
    function splat(x: number, y: number, dx: number, dy: number, color: { r: number; g: number; b: number }) {
      if (!gl) return;
      // Splat velocity
      bindQuad(splatProgram);
      gl.uniform1i(gl.getUniformLocation(splatProgram, 'uTarget'), velocity.read.attach(0));
      gl.uniform1f(gl.getUniformLocation(splatProgram, 'aspectRatio'), canvas!.width / canvas!.height);
      gl.uniform2f(gl.getUniformLocation(splatProgram, 'point'), x, y);
      gl.uniform3f(gl.getUniformLocation(splatProgram, 'color'), dx, dy, 0.0);
      gl.uniform1f(gl.getUniformLocation(splatProgram, 'radius'), config.SPLAT_RADIUS / 100);
      gl.bindFramebuffer(gl.FRAMEBUFFER, velocity.write.fbo);
      gl.viewport(0, 0, velocity.width, velocity.height);
      gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
      velocity.swap();

      // Splat dye
      gl.uniform1i(gl.getUniformLocation(splatProgram, 'uTarget'), density.read.attach(0));
      gl.uniform3f(gl.getUniformLocation(splatProgram, 'color'), color.r, color.g, color.b);
      gl.bindFramebuffer(gl.FRAMEBUFFER, density.write.fbo);
      gl.viewport(0, 0, density.width, density.height);
      gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
      density.swap();
    }

    function multipleSplats(count: number) {
      for (let i = 0; i < count; i++) {
        const color = generateFlowstateColor();
        color.r *= 4.0;
        color.g *= 4.0;
        color.b *= 4.0;
        const x = Math.random();
        const y = Math.random();
        const dx = 1000 * (Math.random() - 0.5);
        const dy = 1000 * (Math.random() - 0.5);
        splat(x, y, dx, dy, color);
      }
    }

    // Splat queue for rapid wave bursts
    const splatStack: number[] = [];

    // Initial entrance burst: multipleSplats(34)
    multipleSplats(34);

    // Follow-up waves: 8 rapid waves
    for (let i = 0; i < 8; i++) {
      splatStack.push(10 + Math.random() * 10);
    }

    // Resize handling
    function resizeCanvas() {
      if (!canvas) return;
      const width = window.innerWidth;
      const height = window.innerHeight;
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
    }

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Pointer interaction
    interface Pointer {
      id: number;
      x: number;
      y: number;
      dx: number;
      dy: number;
      down: boolean;
      moved: boolean;
      color: { r: number; g: number; b: number };
    }

    const pointers: Pointer[] = [];
    pointers.push({
      id: -1,
      x: 0,
      y: 0,
      dx: 0,
      dy: 0,
      down: false,
      moved: false,
      color: generateFlowstateColor(),
    });

    const handlePointerMove = (e: MouseEvent) => {
      const p = pointers[0];
      const x = e.clientX / window.innerWidth;
      const y = 1.0 - e.clientY / window.innerHeight;
      p.dx = (x - p.x) * 5.0;
      p.dy = (y - p.y) * 5.0;
      p.x = x;
      p.y = y;
      p.moved = true;
      p.color = generateFlowstateColor();
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        const p = pointers[0];
        const x = touch.clientX / window.innerWidth;
        const y = 1.0 - touch.clientY / window.innerHeight;
        p.dx = (x - p.x) * 5.0;
        p.dy = (y - p.y) * 5.0;
        p.x = x;
        p.y = y;
        p.moved = true;
        p.color = generateFlowstateColor();
      }
    };

    window.addEventListener('mousemove', handlePointerMove, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });

    // Auto invisible cursor orbit state
    let orbitAngle = 0;
    const startTime = performance.now();
    let animationFrameId: number;
    let lastTime = performance.now();

    // Main animation loop
    function update() {
      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.033);
      lastTime = now;

      if (!gl || !canvas) return;

      // Handle follow-up burst waves from splatStack
      if (splatStack.length > 0) {
        const count = splatStack.pop() || 0;
        multipleSplats(Math.floor(count));
      }

      // Automatic invisible cursor movement
      if (now - startTime > config.ORBIT_START_DELAY) {
        orbitAngle += config.ORBIT_SPEED;
        const breathing = 0.72 + 0.28 * Math.sin(orbitAngle * 0.37);
        const radius = (config.ORBIT_RADIUS * breathing) / Math.min(canvas.width, canvas.height);
        const centerX = 0.5;
        const centerY = 0.5;
        const autoX = centerX + radius * Math.cos(orbitAngle);
        const autoY = centerY + radius * Math.sin(orbitAngle);
        const autoDx = -Math.sin(orbitAngle) * 280;
        const autoDy = Math.cos(orbitAngle) * 280;
        const autoColor = generateFlowstateColor();
        autoColor.r *= 1.4;
        autoColor.g *= 1.4;
        autoColor.b *= 1.4;
        splat(autoX, autoY, autoDx, autoDy, autoColor);
      }

      // Real user pointer interaction
      for (const p of pointers) {
        if (p.moved) {
          p.moved = false;
          splat(p.x, p.y, p.dx * 180, p.dy * 180, p.color);
        }
      }

      // 1. Curl
      bindQuad(curlProgram);
      gl.uniform2f(gl.getUniformLocation(curlProgram, 'texelSize'), velocity.texelSizeX, velocity.texelSizeY);
      gl.uniform1i(gl.getUniformLocation(curlProgram, 'uVelocity'), velocity.read.attach(0));
      gl.bindFramebuffer(gl.FRAMEBUFFER, curl.fbo);
      gl.viewport(0, 0, curl.width, curl.height);
      gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);

      // 2. Vorticity Confinement
      bindQuad(vorticityProgram);
      gl.uniform2f(gl.getUniformLocation(vorticityProgram, 'texelSize'), velocity.texelSizeX, velocity.texelSizeY);
      gl.uniform1i(gl.getUniformLocation(vorticityProgram, 'uVelocity'), velocity.read.attach(0));
      gl.uniform1i(gl.getUniformLocation(vorticityProgram, 'uCurl'), curl.attach(1));
      gl.uniform1f(gl.getUniformLocation(vorticityProgram, 'curl'), config.CURL);
      gl.uniform1f(gl.getUniformLocation(vorticityProgram, 'dt'), dt);
      gl.bindFramebuffer(gl.FRAMEBUFFER, velocity.write.fbo);
      gl.viewport(0, 0, velocity.width, velocity.height);
      gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
      velocity.swap();

      // 3. Divergence
      bindQuad(divergenceProgram);
      gl.uniform2f(gl.getUniformLocation(divergenceProgram, 'texelSize'), velocity.texelSizeX, velocity.texelSizeY);
      gl.uniform1i(gl.getUniformLocation(divergenceProgram, 'uVelocity'), velocity.read.attach(0));
      gl.bindFramebuffer(gl.FRAMEBUFFER, divergence.fbo);
      gl.viewport(0, 0, divergence.width, divergence.height);
      gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);

      // 4. Clear pressure with dissipation
      bindQuad(clearProgram);
      gl.uniform1i(gl.getUniformLocation(clearProgram, 'uTexture'), pressure.read.attach(0));
      gl.uniform1f(gl.getUniformLocation(clearProgram, 'value'), config.PRESSURE_DISSIPATION);
      gl.bindFramebuffer(gl.FRAMEBUFFER, pressure.write.fbo);
      gl.viewport(0, 0, pressure.width, pressure.height);
      gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
      pressure.swap();

      // 5. Pressure Poisson solve (Jacobi iterations)
      bindQuad(pressureProgram);
      gl.uniform2f(gl.getUniformLocation(pressureProgram, 'texelSize'), velocity.texelSizeX, velocity.texelSizeY);
      gl.uniform1i(gl.getUniformLocation(pressureProgram, 'uDivergence'), divergence.attach(1));
      for (let i = 0; i < config.PRESSURE_ITERATIONS; i++) {
        gl.uniform1i(gl.getUniformLocation(pressureProgram, 'uPressure'), pressure.read.attach(0));
        gl.bindFramebuffer(gl.FRAMEBUFFER, pressure.write.fbo);
        gl.viewport(0, 0, pressure.width, pressure.height);
        gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
        pressure.swap();
      }

      // 6. Gradient Subtract (project velocity to divergence-free field)
      bindQuad(gradientSubtractProgram);
      gl.uniform2f(gl.getUniformLocation(gradientSubtractProgram, 'texelSize'), velocity.texelSizeX, velocity.texelSizeY);
      gl.uniform1i(gl.getUniformLocation(gradientSubtractProgram, 'uPressure'), pressure.read.attach(0));
      gl.uniform1i(gl.getUniformLocation(gradientSubtractProgram, 'uVelocity'), velocity.read.attach(1));
      gl.bindFramebuffer(gl.FRAMEBUFFER, velocity.write.fbo);
      gl.viewport(0, 0, velocity.width, velocity.height);
      gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
      velocity.swap();

      // 7. Advect velocity
      bindQuad(advectionProgram);
      gl.uniform2f(gl.getUniformLocation(advectionProgram, 'texelSize'), velocity.texelSizeX, velocity.texelSizeY);
      gl.uniform1i(gl.getUniformLocation(advectionProgram, 'uVelocity'), velocity.read.attach(0));
      gl.uniform1i(gl.getUniformLocation(advectionProgram, 'uSource'), velocity.read.attach(0));
      gl.uniform1f(gl.getUniformLocation(advectionProgram, 'dt'), dt);
      gl.uniform1f(gl.getUniformLocation(advectionProgram, 'dissipation'), config.VELOCITY_DISSIPATION);
      gl.bindFramebuffer(gl.FRAMEBUFFER, velocity.write.fbo);
      gl.viewport(0, 0, velocity.width, velocity.height);
      gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
      velocity.swap();

      // 8. Advect dye / color density
      gl.uniform2f(gl.getUniformLocation(advectionProgram, 'texelSize'), velocity.texelSizeX, velocity.texelSizeY);
      gl.uniform1i(gl.getUniformLocation(advectionProgram, 'uVelocity'), velocity.read.attach(0));
      gl.uniform1i(gl.getUniformLocation(advectionProgram, 'uSource'), density.read.attach(1));
      gl.uniform1f(gl.getUniformLocation(advectionProgram, 'dissipation'), config.DENSITY_DISSIPATION);
      gl.bindFramebuffer(gl.FRAMEBUFFER, density.write.fbo);
      gl.viewport(0, 0, density.width, density.height);
      gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
      density.swap();

      // 9. Display pass to screen
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, canvas.width, canvas.height);
      bindQuad(displayProgram);
      gl.uniform2f(gl.getUniformLocation(displayProgram, 'texelSize'), 1 / canvas.width, 1 / canvas.height);
      gl.uniform1i(gl.getUniformLocation(displayProgram, 'uTexture'), density.read.attach(0));
      gl.uniform3f(
        gl.getUniformLocation(displayProgram, 'backColor'),
        config.BACK_COLOR.r,
        config.BACK_COLOR.g,
        config.BACK_COLOR.b
      );
      gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);

      animationFrameId = requestAnimationFrame(update);
    }

    animationFrameId = requestAnimationFrame(update);

    // Cleanup on unmount
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('touchmove', handleTouchMove);
      if (gl) {
        gl.deleteBuffer(quadBuffer);
        gl.deleteProgram(clearProgram);
        gl.deleteProgram(splatProgram);
        gl.deleteProgram(advectionProgram);
        gl.deleteProgram(divergenceProgram);
        gl.deleteProgram(curlProgram);
        gl.deleteProgram(vorticityProgram);
        gl.deleteProgram(pressureProgram);
        gl.deleteProgram(gradientSubtractProgram);
        gl.deleteProgram(displayProgram);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none z-0"
      style={{
        backgroundColor: '#04050c',
      }}
    />
  );
};
