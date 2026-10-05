/**
 * Core 3D CAD Engine for Web-CAD Studio
 * Powered by Three.js & OrbitControls
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

    // View state
    this.isOrtho = false;
    this.renderMode = 'shaded-edges'; // 'shaded', 'shaded-edges', 'wireframe', 'ghost', 'normals'
    this.showDimensions = false;
    this.showGrid = true;
    this.currentMaterialKey = 'steel';

    // Clipping plane state
    this.clippingEnabled = false;
    this.clippingAxis = 'y'; // 'x', 'y', 'z'
    this.clippingValue = 0;
    this.clipPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);

    // Material presets
    this.materials = {
      steel: new THREE.MeshStandardMaterial({
        color: 0xc8cdd8,
        metalness: 0.85,
        roughness: 0.28,
        name: 'Werkzeugstahl (Tool Steel)'
      }),
      aluminum: new THREE.MeshStandardMaterial({
        color: 0x98b8d8,
        metalness: 0.65,
        roughness: 0.35,
        name: 'Aluminium eloxiert'
      }),
      brass: new THREE.MeshStandardMaterial({
        color: 0xd4af37,
        metalness: 0.88,
        roughness: 0.3,
        name: 'Messing poliert'
      }),
      plastic_orange: new THREE.MeshStandardMaterial({
        color: 0xff6600,
        metalness: 0.05,
        roughness: 0.45,
        name: 'Technischer Kunststoff (PLA Orange)'
      }),
      plastic_white: new THREE.MeshStandardMaterial({
        color: 0xf0f2f5,
        metalness: 0.05,
        roughness: 0.35,
        name: 'Polymer (POM Weiß)'
      }),
      cast_iron: new THREE.MeshStandardMaterial({
        color: 0x3e4249,
        metalness: 0.7,
        roughness: 0.65,
        name: 'Gusseisen'
      })
    };

    // Configure materials for clipping
    Object.values(this.materials).forEach(mat => {
      mat.clippingPlanes = [];
      mat.clipShadows = true;
      mat.side = THREE.DoubleSide; // Essential for seeing inside hollow parts
    });

    this.edgeMaterial = new THREE.LineBasicMaterial({
      color: 0x111622,
      linewidth: 1.5
    });

    this.init();
  }

  init() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    // 1. Scene
    this.scene = new THREE.Scene();

    // 2. Cameras
    const aspect = width / height;
    this.perspCamera = new THREE.PerspectiveCamera(40, aspect, 0.5, 3000);
    this.perspCamera.position.set(160, 140, 200);

    const frustumSize = 250;
    this.orthoCamera = new THREE.OrthographicCamera(
      (frustumSize * aspect) / -2,
      (frustumSize * aspect) / 2,
      frustumSize / 2,
      frustumSize / -2,
      -2000,
      2000
    );
    this.orthoCamera.position.copy(this.perspCamera.position);

    this.camera = this.perspCamera;

    // 3. Renderer with local clipping enabled
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.localClippingEnabled = true;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.domElement.id = 'three-canvas';
    this.container.appendChild(this.renderer.domElement);

    // 4. OrbitControls
    this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.target.set(0, 0, 0);

    // 5. Lighting
    this.setupLighting();

    // 6. Helpers (Ground grid & XYZ axes)
    this.setupHelpers();

    // 7. Dimension Group
    this.dimensionGroup = new THREE.Group();
    this.scene.add(this.dimensionGroup);

    // 8. Event Listeners
    window.addEventListener('resize', () => this.onResize());

    // 9. Animation loop
    this.animate();
  }

  setupLighting() {
    const ambient = new THREE.AmbientLight(0xffffff, 0.45);
    this.scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xffffff, 0.9);
    keyLight.position.set(150, 250, 180);
    this.scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x90b0e0, 0.45);
    fillLight.position.set(-150, 100, -120);
    this.scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffffff, 0.35);
    rimLight.position.set(0, -150, -100);
    this.scene.add(rimLight);
  }

  setupHelpers() {
    // Metric ground grid (200x200mm, with 10mm divisions)
    this.gridHelper = new THREE.GridHelper(300, 30, 0x485166, 0x242833);
    this.gridHelper.position.y = -35;
    this.scene.add(this.gridHelper);

    // CAD coordinate axes (X=Red, Y=Green, Z=Blue)
    this.axesHelper = new THREE.AxesHelper(40);
    this.axesHelper.position.set(-90, -34.8, -90);
    this.scene.add(this.axesHelper);
  }

  /**
   * Set active mesh in viewport and calculate features
   */
  setMesh(geometry) {
    // Remove existing mesh and edges
    if (this.currentMesh) {
      this.scene.remove(this.currentMesh);
      if (this.currentMesh.geometry) this.currentMesh.geometry.dispose();
    }
    if (this.edgeLines) {
      this.scene.remove(this.edgeLines);
      if (this.edgeLines.geometry) this.edgeLines.geometry.dispose();
    }

    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();

    // Center geometry on origin
    geometry.center();

    // Adjust grid height to sit right underneath the part
    const bBox = geometry.boundingBox;
    this.gridHelper.position.y = bBox.min.y - 1;
    this.axesHelper.position.y = bBox.min.y - 0.8;

    // Create Main Mesh
    const mat = this.getActiveMaterial();
    this.currentMesh = new THREE.Mesh(geometry, mat);
    this.scene.add(this.currentMesh);

    // Generate sharp CAD outline edges
    const edges = new THREE.EdgesGeometry(geometry, 28);
    this.edgeLines = new THREE.LineSegments(edges, this.edgeMaterial);
    this.scene.add(this.edgeLines);

    // Apply current render mode & clipping
    this.applyRenderMode();
    this.updateClipping();

    // Update dimensions
    this.updateDimensions();
  }

  /**
   * Returns current active material based on selection and render mode
   */
  getActiveMaterial() {
    if (this.renderMode === 'normals') {
      return new THREE.MeshNormalMaterial({
        side: THREE.DoubleSide,
        clippingPlanes: this.clippingEnabled ? [this.clipPlane] : []
      });
    }

    const baseMat = this.materials[this.currentMaterialKey] || this.materials.steel;

    if (this.renderMode === 'wireframe') {
      baseMat.wireframe = true;
      baseMat.transparent = false;
      baseMat.opacity = 1.0;
    } else if (this.renderMode === 'ghost') {
      baseMat.wireframe = false;
      baseMat.transparent = true;
      baseMat.opacity = 0.35;
    } else {
      baseMat.wireframe = false;
      baseMat.transparent = false;
      baseMat.opacity = 1.0;
    }

    baseMat.clippingPlanes = this.clippingEnabled ? [this.clipPlane] : [];
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
   * Toggle Orthographic / Perspective Camera
   */
  setCameraProjection(isOrtho) {
    this.isOrtho = isOrtho;
    const oldCam = this.camera;
    const target = this.controls.target.clone();
    const pos = oldCam.position.clone();

    if (this.isOrtho) {
      this.camera = this.orthoCamera;
      const aspect = this.container.clientWidth / this.container.clientHeight;
      const dist = pos.distanceTo(target);
      const frustum = dist * 0.9;
      this.orthoCamera.left = (-frustum * aspect) / 2;
      this.orthoCamera.right = (frustum * aspect) / 2;
      this.orthoCamera.top = frustum / 2;
      this.orthoCamera.bottom = -frustum / 2;
      this.orthoCamera.updateProjectionMatrix();
    } else {
      this.camera = this.perspCamera;
      this.perspCamera.updateProjectionMatrix();
    }

    this.camera.position.copy(pos);
    this.controls.object = this.camera;
    this.controls.target.copy(target);
    this.controls.update();
  }

  /**
   * Set standard CAD viewpoints
   */
  setView(viewName) {
    if (!this.currentMesh) return;
    const dist = 240;

    switch (viewName) {
      case 'top':
        this.camera.position.set(0, dist, 0);
        this.controls.target.set(0, 0, 0);
        break;
      case 'front':
        this.camera.position.set(0, 0, dist);
        this.controls.target.set(0, 0, 0);
        break;
      case 'right':
        this.camera.position.set(dist, 0, 0);
        this.controls.target.set(0, 0, 0);
        break;
      case 'left':
        this.camera.position.set(-dist, 0, 0);
        this.controls.target.set(0, 0, 0);
        break;
      case 'bottom':
        this.camera.position.set(0, -dist, 0);
        this.controls.target.set(0, 0, 0);
        break;
      case 'iso':
      default:
        this.camera.position.set(160, 140, 200);
        this.controls.target.set(0, 0, 0);
        break;
    }
    this.controls.update();
  }

  /**
   * Section / Clipping Plane handling
   */
  setClipping(enabled, axis = 'y', value = 0) {
    this.clippingEnabled = enabled;
    this.clippingAxis = axis;
    this.clippingValue = value;
    this.updateClipping();
  }

  updateClipping() {
    if (this.clippingEnabled) {
      let normal = new THREE.Vector3(0, -1, 0);
      if (this.clippingAxis === 'x') normal.set(-1, 0, 0);
      else if (this.clippingAxis === 'z') normal.set(0, 0, -1);

      this.clipPlane.set(normal, this.clippingValue);
      if (this.currentMesh) {
        this.currentMesh.material.clippingPlanes = [this.clipPlane];
      }
    } else {
      if (this.currentMesh) {
        this.currentMesh.material.clippingPlanes = [];
      }
    }
  }

  /**
   * 3D Bounding Box Dimensioning Overlay
   */
  toggleDimensions(show) {
    this.showDimensions = show;
    this.updateDimensions();
  }

  updateDimensions() {
    while (this.dimensionGroup.children.length > 0) {
      const obj = this.dimensionGroup.children[0];
      this.dimensionGroup.remove(obj);
      if (obj.geometry) obj.geometry.dispose();
    }

    if (!this.showDimensions || !this.currentMesh) return;

    const bBox = this.currentMesh.geometry.boundingBox;
    const dx = bBox.max.x - bBox.min.x;
    const dy = bBox.max.y - bBox.min.y;
    const dz = bBox.max.z - bBox.min.z;

    // Create bounding box lines
    const boxHelper = new THREE.Box3Helper(bBox, 0x00d2d3);
    this.dimensionGroup.add(boxHelper);
  }

  toggleGrid(show) {
    this.showGrid = show;
    this.gridHelper.visible = show;
    this.axesHelper.visible = show;
  }

  onResize() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    const aspect = width / height;

    this.perspCamera.aspect = aspect;
    this.perspCamera.updateProjectionMatrix();

    const frustum = 250;
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
