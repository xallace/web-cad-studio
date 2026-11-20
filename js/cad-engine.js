/**
 * Core 3D CAD Engine for Web-CAD Studio
 * DIN ISO 841 Z-Up Coordinate System · Three.js & OrbitControls
 */

class CADEngine {
  constructor(canvasContainerId) {
    this.container = document.getElementById(canvasContainerId);
    this.scene = null;
    this.renderer = null;
    this.camera = null;
    this.perspCamera = null;
    this.orthoCamera = null;
    this.controls = null;
    this.currentMesh = null;
    this.edgeLines = null;
    this.dimensionGroup = null;
    this.gridHelper = null;
    this.axesHelper = null;
    this.clipPlaneHelper = null;
    this.envRenderTarget = null;

    // View state
    this.isOrtho = false;
    this.orthoFrustumSize = 220;
    this.renderMode = 'shaded-edges'; // 'shaded', 'shaded-edges', 'wireframe', 'ghost', 'normals'
    this.showDimensions = false;
    this.showGrid = true;
    this.currentMaterialKey = 'steel';

    // Clipping plane state (Z-Up: default Z-Axis horizontal section)
    this.clippingEnabled = false;
    this.clippingAxis = 'z'; // 'x', 'y', 'z'
    this.clippingValue = 0;
    this.clipPlane = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0);

    // Material presets
    this.materials = {
      steel: new THREE.MeshStandardMaterial({
        color: 0xc8cdd8,
        metalness: 0.82,
        roughness: 0.28,
        name: 'Tool Steel'
      }),
      aluminum: new THREE.MeshStandardMaterial({
        color: 0xa4c0dc,
        metalness: 0.65,
        roughness: 0.34,
        name: 'Anodized Aluminum'
      }),
      brass: new THREE.MeshStandardMaterial({
        color: 0xd4af37,
        metalness: 0.85,
        roughness: 0.28,
        name: 'Polished Brass'
      }),
      plastic_orange: new THREE.MeshStandardMaterial({
        color: 0xff6600,
        metalness: 0.05,
        roughness: 0.42,
        name: 'Engineering Plastic (PLA Orange)'
      }),
      plastic_white: new THREE.MeshStandardMaterial({
        color: 0xf0f2f5,
        metalness: 0.05,
        roughness: 0.35,
        name: 'Polymer (POM White)'
      }),
      cast_iron: new THREE.MeshStandardMaterial({
        color: 0x4b505a,
        metalness: 0.72,
        roughness: 0.58,
        name: 'Gray Cast Iron'
      })
    };

    // Reusable normal inspection material (prevents GPU material leaks)
    this.normalMaterial = new THREE.MeshNormalMaterial({
      side: THREE.DoubleSide,
      clippingPlanes: []
    });

    // Configure materials for clipping & interior visibility
    Object.values(this.materials).forEach(mat => {
      mat.clippingPlanes = [];
      mat.clipShadows = true;
      mat.side = THREE.DoubleSide;
    });

    this.edgeMaterial = new THREE.LineBasicMaterial({
      color: 0x0d111a,
      linewidth: 1.5,
      clippingPlanes: []
    });

    this.init();
  }

  init() {
    const width = Math.max(1, this.container.clientWidth);
    const height = Math.max(1, this.container.clientHeight);
    const aspect = width / height;

    // 1. Scene
    this.scene = new THREE.Scene();

    // 2. Cameras configured for DIN ISO 841 (Z = Up)
    this.perspCamera = new THREE.PerspectiveCamera(40, aspect, 0.5, 5000);
    this.perspCamera.up.set(0, 0, 1);
    this.perspCamera.position.set(140, -160, 120);

    const frustumSize = this.orthoFrustumSize;
    this.orthoCamera = new THREE.OrthographicCamera(
      (frustumSize * aspect) / -2,
      (frustumSize * aspect) / 2,
      frustumSize / 2,
      frustumSize / -2,
      -3000,
      3000
    );
    this.orthoCamera.up.set(0, 0, 1);
    this.orthoCamera.position.copy(this.perspCamera.position);

    this.camera = this.perspCamera;

    // 3. Renderer with local clipping enabled (alpha allows subtle CSS viewport gradient)
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.localClippingEnabled = true;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.domElement.id = 'three-canvas';
    this.container.appendChild(this.renderer.domElement);

    // 4. Procedural Studio Environment Map for realistic metallic reflections
    this.setupStudioEnvironment();

    // 5. OrbitControls
    this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.target.set(0, 0, 0);

    // 6. Lighting
    this.setupLighting();

    // 7. Helpers (Z-Up XY ground grid, XYZ axes & section plane indicator)
    this.setupHelpers();

    // 8. Dimension Group
    this.dimensionGroup = new THREE.Group();
    this.scene.add(this.dimensionGroup);

    // 9. Resize handling
    window.addEventListener('resize', () => this.onResize());

    // 10. Animation loop
    this.animate();
  }

  setupStudioEnvironment() {
    if (!THREE.PMREMGenerator) return;
    try {
      const pmrem = new THREE.PMREMGenerator(this.renderer);
      const envScene = new THREE.Scene();
      envScene.background = new THREE.Color(0x1b202b);

      // Soft studio light panels
      const addPanel = (color, intensity, w, h, pos, rot) => {
        const mat = new THREE.MeshBasicMaterial({
          color: new THREE.Color(color).multiplyScalar(intensity),
          side: THREE.DoubleSide
        });
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
        mesh.position.set(pos[0], pos[1], pos[2]);
        mesh.rotation.set(rot[0], rot[1], rot[2]);
        envScene.add(mesh);
      };

      // Overhead softbox (+Z), warm key panel, cool fill panel, subtle floor bounce
      addPanel(0xffffff, 2.2, 14, 14, [0, 0, 10], [Math.PI, 0, 0]);
      addPanel(0xfff4e0, 1.6, 12, 8, [10, -8, 4], [0, -Math.PI / 2, 0]);
      addPanel(0x88b8ff, 1.3, 12, 8, [-10, 6, 3], [0, Math.PI / 2, 0]);
      addPanel(0xdce8ff, 0.9, 12, 8, [0, 10, 2], [Math.PI / 2, 0, 0]);
      addPanel(0x3a4354, 0.6, 16, 16, [0, 0, -10], [0, 0, 0]);

      this.envRenderTarget = pmrem.fromScene(envScene, 0.04);
      this.scene.environment = this.envRenderTarget.texture;

      // Clean up temporary environment scene resources
      envScene.traverse(obj => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) obj.material.dispose();
      });
      pmrem.dispose();
    } catch (err) {
      // Fallback gracefully to direct lights only
      console.warn('Studio PMREM environment skipped:', err);
    }
  }

  setupLighting() {
    const ambient = new THREE.AmbientLight(0xffffff, 0.42);
    this.scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xffffff, 0.95);
    keyLight.position.set(160, -190, 260);
    this.scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x90b4e8, 0.5);
    fillLight.position.set(-180, 140, 130);
    this.scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffffff, 0.38);
    rimLight.position.set(0, 180, -140);
    this.scene.add(rimLight);
  }

  setupHelpers() {
    // Metric XY ground grid (300x300 mm, 10 mm divisions) rotated to XY plane for Z-Up
    this.gridHelper = new THREE.GridHelper(300, 30, 0x485166, 0x242833);
    this.gridHelper.rotation.x = Math.PI / 2;
    this.gridHelper.position.z = -35;
    this.scene.add(this.gridHelper);

    // CAD coordinate axes (X=Red, Y=Green, Z=Blue pointing Up)
    this.axesHelper = new THREE.AxesHelper(40);
    this.axesHelper.position.set(-110, -110, -34.8);
    this.scene.add(this.axesHelper);

    // Subtle visual indicator frame for active section plane
    const planeGeo = new THREE.PlaneGeometry(1, 1);
    const frameEdges = new THREE.EdgesGeometry(planeGeo);
    const planeFill = new THREE.Mesh(
      planeGeo,
      new THREE.MeshBasicMaterial({
        color: 0x00d2d3,
        transparent: true,
        opacity: 0.08,
        side: THREE.DoubleSide,
        depthWrite: false
      })
    );
    const planeBorder = new THREE.LineSegments(
      frameEdges,
      new THREE.LineBasicMaterial({ color: 0x00d2d3, transparent: true, opacity: 0.55 })
    );
    this.clipPlaneHelper = new THREE.Group();
    this.clipPlaneHelper.add(planeFill);
    this.clipPlaneHelper.add(planeBorder);
    this.clipPlaneHelper.visible = false;
    this.scene.add(this.clipPlaneHelper);
  }

  /**
   * Set active mesh in viewport and adjust helpers
   */
  setMesh(geometry) {
    // Remove and dispose existing mesh and edges
    if (this.currentMesh) {
      this.scene.remove(this.currentMesh);
      if (this.currentMesh.geometry) this.currentMesh.geometry.dispose();
    }
    if (this.edgeLines) {
      this.scene.remove(this.edgeLines);
      if (this.edgeLines.geometry) this.edgeLines.geometry.dispose();
    }

    // Center geometry on origin & refresh bounds
    geometry.center();
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();

    // Seat XY ground grid directly underneath the part (Z = min.z)
    const bBox = geometry.boundingBox;
    const sizeX = bBox.max.x - bBox.min.x;
    const sizeY = bBox.max.y - bBox.min.y;
    const maxHoriz = Math.max(sizeX, sizeY, 60);
    const gridScale = Math.max(1, Math.ceil((maxHoriz * 1.8) / 300));
    this.gridHelper.scale.set(gridScale, 1, gridScale);
    this.gridHelper.position.z = bBox.min.z - 0.6;

    const axisOffset = Math.min(130 * gridScale, Math.max(60, maxHoriz * 0.72));
    this.axesHelper.position.set(-axisOffset, -axisOffset, bBox.min.z - 0.4);

    // Create Main Mesh
    const mat = this.getActiveMaterial();
    this.currentMesh = new THREE.Mesh(geometry, mat);
    this.scene.add(this.currentMesh);

    // Generate sharp CAD outline edges
    const edges = new THREE.EdgesGeometry(geometry, 26);
    this.edgeLines = new THREE.LineSegments(edges, this.edgeMaterial);
    this.scene.add(this.edgeLines);

    // Apply current render mode, clipping & dimensions
    this.applyRenderMode();
    this.updateClipping();
    this.updateDimensions();
  }

  /**
   * Returns current active material based on selection and render mode
   */
  getActiveMaterial() {
    const activePlanes = this.clippingEnabled ? [this.clipPlane] : [];

    if (this.renderMode === 'normals') {
      this.normalMaterial.clippingPlanes = activePlanes;
      return this.normalMaterial;
    }

    const baseMat = this.materials[this.currentMaterialKey] || this.materials.steel;

    if (this.renderMode === 'wireframe') {
      baseMat.wireframe = true;
      baseMat.transparent = false;
      baseMat.opacity = 1.0;
      baseMat.depthWrite = true;
    } else if (this.renderMode === 'ghost') {
      baseMat.wireframe = false;
      baseMat.transparent = true;
      baseMat.opacity = 0.35;
      baseMat.depthWrite = false;
    } else {
      baseMat.wireframe = false;
      baseMat.transparent = false;
      baseMat.opacity = 1.0;
      baseMat.depthWrite = true;
    }

    baseMat.clippingPlanes = activePlanes;
    baseMat.needsUpdate = true;
    return baseMat;
  }

  setMaterial(key) {
    if (this.materials[key]) {
      this.currentMaterialKey = key;
      if (this.currentMesh) {
        this.currentMesh.material = this.getActiveMaterial();
      }
    }
  }

  setRenderMode(mode) {
    this.renderMode = mode;
    this.applyRenderMode();
  }

  applyRenderMode() {
    if (!this.currentMesh) return;
    this.currentMesh.material = this.getActiveMaterial();

    if (this.edgeLines) {
      this.edgeLines.visible = (this.renderMode === 'shaded-edges');
    }
  }

  /**
   * Seamless Perspective <-> Orthographic camera toggle (preserves framing & zoom)
   */
  setCameraProjection(isOrtho) {
    if (this.isOrtho === isOrtho) return;
    this.isOrtho = isOrtho;

    const oldCam = this.camera;
    const target = this.controls.target.clone();
    const offset = oldCam.position.clone().sub(target);
    const dist = Math.max(1, offset.length());
    const width = Math.max(1, this.container.clientWidth);
    const height = Math.max(1, this.container.clientHeight);
    const aspect = width / height;
    const halfFovRad = THREE.MathUtils.degToRad(this.perspCamera.fov * 0.5);

    if (this.isOrtho) {
      // Match visible vertical span of perspective camera at target distance
      const frustum = 2.0 * dist * Math.tan(halfFovRad);
      this.orthoFrustumSize = frustum;
      this.orthoCamera.left = (-frustum * aspect) / 2;
      this.orthoCamera.right = (frustum * aspect) / 2;
      this.orthoCamera.top = frustum / 2;
      this.orthoCamera.bottom = -frustum / 2;
      this.orthoCamera.zoom = 1;
      this.orthoCamera.position.copy(oldCam.position);
      this.orthoCamera.updateProjectionMatrix();
      this.camera = this.orthoCamera;
    } else {
      // Preserve effective zoom performed while in orthographic mode
      const effectiveFrustum = this.orthoFrustumSize / Math.max(0.05, this.orthoCamera.zoom);
      const newDist = effectiveFrustum / (2.0 * Math.tan(halfFovRad));
      const newPos = target.clone().add(offset.normalize().multiplyScalar(newDist));
      this.perspCamera.position.copy(newPos);
      this.perspCamera.aspect = aspect;
      this.perspCamera.updateProjectionMatrix();
      this.camera = this.perspCamera;
    }

    this.controls.object = this.camera;
    this.controls.target.copy(target);
    this.controls.update();
  }

  /**
   * Standard DIN ISO 841 Z-Up CAD viewpoints, auto-fitted to part size
   */
  setView(viewName) {
    if (!this.currentMesh) return;

    const sphere = this.currentMesh.geometry.boundingSphere;
    const radius = Math.max(12, sphere ? sphere.radius : 60);
    const halfFovRad = THREE.MathUtils.degToRad(this.perspCamera.fov * 0.5);
    const fitDist = (radius / Math.sin(halfFovRad)) * 1.25;

    switch (viewName) {
      case 'top':
        // Tiny -Y offset avoids OrbitControls pole singularity while keeping +X right & +Y up
        this.camera.position.set(0, -fitDist * 0.001, fitDist);
        break;
      case 'bottom':
        this.camera.position.set(0, -fitDist * 0.001, -fitDist);
        break;
      case 'front':
        this.camera.position.set(0, -fitDist, 0);
        break;
      case 'right':
        this.camera.position.set(fitDist, 0, 0);
        break;
      case 'left':
        this.camera.position.set(-fitDist, 0, 0);
        break;
      case 'iso':
      default: {
        const d = fitDist / Math.sqrt(3);
        this.camera.position.set(d * 1.05, -d * 1.15, d * 0.92);
        break;
      }
    }

    // Sync orthographic frustum cleanly on view reset
    if (this.isOrtho) {
      const width = Math.max(1, this.container.clientWidth);
      const height = Math.max(1, this.container.clientHeight);
      const aspect = width / height;
      const frustum = 2.0 * fitDist * Math.tan(halfFovRad);
      this.orthoFrustumSize = frustum;
      this.orthoCamera.left = (-frustum * aspect) / 2;
      this.orthoCamera.right = (frustum * aspect) / 2;
      this.orthoCamera.top = frustum / 2;
      this.orthoCamera.bottom = -frustum / 2;
      this.orthoCamera.zoom = 1;
      this.orthoCamera.updateProjectionMatrix();
    }

    this.controls.target.set(0, 0, 0);
    this.controls.update();
  }

  /**
   * Section / Clipping Plane handling (clips BOTH mesh and CAD outline edges)
   */
  setClipping(enabled, axis = 'z', value = 0) {
    this.clippingEnabled = enabled;
    this.clippingAxis = axis;
    this.clippingValue = value;
    this.updateClipping();
  }

  updateClipping() {
    const activePlanes = this.clippingEnabled ? [this.clipPlane] : [];

    if (this.clippingEnabled) {
      const normal = new THREE.Vector3(0, 0, -1);
      if (this.clippingAxis === 'x') normal.set(-1, 0, 0);
      else if (this.clippingAxis === 'y') normal.set(0, -1, 0);

      // Plane equation: normal.dot(P) + constant >= 0 => keeps coord <= clippingValue
      this.clipPlane.set(normal, this.clippingValue);
    }

    if (this.currentMesh) {
      this.currentMesh.material.clippingPlanes = activePlanes;
    }
    this.normalMaterial.clippingPlanes = activePlanes;
    this.edgeMaterial.clippingPlanes = activePlanes;

    // Position visual section plane frame
    if (this.clipPlaneHelper) {
      this.clipPlaneHelper.visible = this.clippingEnabled && !!this.currentMesh;
      if (this.clipPlaneHelper.visible && this.currentMesh) {
        const bBox = this.currentMesh.geometry.boundingBox;
        const pad = 16;
        const sx = (bBox.max.x - bBox.min.x) + pad;
        const sy = (bBox.max.y - bBox.min.y) + pad;
        const sz = (bBox.max.z - bBox.min.z) + pad;

        this.clipPlaneHelper.rotation.set(0, 0, 0);
        this.clipPlaneHelper.position.set(0, 0, 0);

        if (this.clippingAxis === 'z') {
          this.clipPlaneHelper.scale.set(sx, sy, 1);
          this.clipPlaneHelper.position.z = this.clippingValue;
        } else if (this.clippingAxis === 'x') {
          this.clipPlaneHelper.rotation.y = Math.PI / 2;
          this.clipPlaneHelper.scale.set(sz, sy, 1);
          this.clipPlaneHelper.position.x = this.clippingValue;
        } else if (this.clippingAxis === 'y') {
          this.clipPlaneHelper.rotation.x = Math.PI / 2;
          this.clipPlaneHelper.scale.set(sx, sz, 1);
          this.clipPlaneHelper.position.y = this.clippingValue;
        }
      }
    }
  }

  /**
   * 3D Bounding Box & Axis Dimensioning Overlay (with proper GPU resource disposal)
   */
  toggleDimensions(show) {
    this.showDimensions = show;
    this.updateDimensions();
  }

  _clearDimensionGroup() {
    while (this.dimensionGroup.children.length > 0) {
      const obj = this.dimensionGroup.children[0];
      this.dimensionGroup.remove(obj);
      obj.traverse(child => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (child.material.map) child.material.map.dispose();
          child.material.dispose();
        }
      });
    }
  }

  _createDimensionLabel(text, accentColor) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = 'rgba(18, 20, 27, 0.88)';
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 3;

    const r = 10;
    const x = 6, y = 6, w = canvas.width - 12, h = canvas.height - 12;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.font = 'bold 26px Consolas, monospace';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2 + 1);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    const mat = new THREE.SpriteMaterial({ map: texture, depthTest: false, transparent: true });
    return new THREE.Sprite(mat);
  }

  updateDimensions() {
    this._clearDimensionGroup();
    if (!this.showDimensions || !this.currentMesh) return;

    const bBox = this.currentMesh.geometry.boundingBox;
    const dx = bBox.max.x - bBox.min.x;
    const dy = bBox.max.y - bBox.min.y;
    const dz = bBox.max.z - bBox.min.z;
    const maxDim = Math.max(dx, dy, dz, 20);
    const offset = Math.max(5, maxDim * 0.08);
    const labelScale = Math.max(12, maxDim * 0.24);

    // Bounding box wireframe
    const boxHelper = new THREE.Box3Helper(bBox, 0x00d2d3);
    this.dimensionGroup.add(boxHelper);

    const addAxisDim = (p1, p2, labelText, hexColor, cssColor) => {
      const lineGeo = new THREE.BufferGeometry().setFromPoints([p1, p2]);
      const lineMat = new THREE.LineBasicMaterial({ color: hexColor });
      this.dimensionGroup.add(new THREE.Line(lineGeo, lineMat));

      const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
      const sprite = this._createDimensionLabel(labelText, cssColor);
      sprite.position.copy(mid);
      sprite.scale.set(labelScale, labelScale * 0.25, 1);
      sprite.renderOrder = 999;
      this.dimensionGroup.add(sprite);
    };

    // X dimension along front-bottom edge
    addAxisDim(
      new THREE.Vector3(bBox.min.x, bBox.min.y - offset, bBox.min.z),
      new THREE.Vector3(bBox.max.x, bBox.min.y - offset, bBox.min.z),
      `X: ${dx.toFixed(1)} mm`,
      0xff5c5c,
      '#ff5c5c'
    );

    // Y dimension along right-bottom edge
    addAxisDim(
      new THREE.Vector3(bBox.max.x + offset, bBox.min.y, bBox.min.z),
      new THREE.Vector3(bBox.max.x + offset, bBox.max.y, bBox.min.z),
      `Y: ${dy.toFixed(1)} mm`,
      0x2ecc71,
      '#2ecc71'
    );

    // Z dimension along front-right vertical edge
    addAxisDim(
      new THREE.Vector3(bBox.max.x + offset, bBox.min.y - offset, bBox.min.z),
      new THREE.Vector3(bBox.max.x + offset, bBox.min.y - offset, bBox.max.z),
      `Z: ${dz.toFixed(1)} mm`,
      0x3498ff,
      '#3498ff'
    );
  }

  toggleGrid(show) {
    this.showGrid = show;
    this.gridHelper.visible = show;
    this.axesHelper.visible = show;
  }

  onResize() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    if (!width || !height) return;

    const aspect = width / height;

    this.perspCamera.aspect = aspect;
    this.perspCamera.updateProjectionMatrix();

    const frustum = this.orthoFrustumSize;
    this.orthoCamera.left = (-frustum * aspect) / 2;
    this.orthoCamera.right = (frustum * aspect) / 2;
    this.orthoCamera.top = frustum / 2;
    this.orthoCamera.bottom = -frustum / 2;
    this.orthoCamera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}
