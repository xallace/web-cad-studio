/**
 * Parametric Engineering Part Generators for Web-CAD Studio
 * Generates dimensionally exact 3D manifold meshes (DIN ISO 841, Z=Up)
 * for CAD inspection, 3D printing & rendering.
 */

const ParametricParts = {
  /**
   * Safe numeric parser (preserves valid 0 values, avoids falsy `||` bug)
   */
  _num(val, fallback) {
    if (val === undefined || val === null || val === '') return fallback;
    const n = Number(val);
    return Number.isFinite(n) ? n : fallback;
  },

  _clamp(val, min, max) {
    return Math.min(max, Math.max(min, val));
  },

  /**
   * 1. Involute Spur Gear (DIN 867 involute profile, DIN 6885 keyway & hub)
   */
  generateSpurGear(params) {
    const m = this._clamp(this._num(params.module, 3.0), 0.5, 20.0);
    const z = this._clamp(Math.round(this._num(params.teeth, 24)), 6, 120);
    const alphaDeg = this._clamp(this._num(params.pressureAngle, 20.0), 10.0, 30.0);
    const alpha = (alphaDeg * Math.PI) / 180.0;
    const b = this._clamp(this._num(params.faceWidth, 20.0), 1.0, 200.0);
    const rawBore = this._clamp(this._num(params.boreDiameter, 18.0), 0.0, 400.0);
    const hasKeyway = params.hasKeyway !== false;
    const rawKwWidth = this._clamp(this._num(params.keywayWidth, 6.0), 0.0, 100.0);
    const rawKwDepth = this._clamp(this._num(params.keywayDepth, 2.8), 0.0, 50.0);
    const hasHub = params.hasHub !== false;
    const rawHubDia = this._clamp(this._num(params.hubDiameter, 36.0), 0.0, 400.0);
    const hubLen = this._clamp(this._num(params.hubLength, 10.0), 0.0, 200.0);

    // Exact DIN 867 / ISO 53 involute gear formulas
    const d = m * z;                           // Pitch diameter
    const r = d / 2.0;                         // Pitch radius
    const ha = m;                              // Addendum
    const hf = 1.25 * m;                       // Dedendum
    const rb = r * Math.cos(alpha);            // Base radius
    const rf = Math.max(0.5, r - hf);          // Root radius
    let ra = r + ha;                           // Tip radius

    const toothAngle = (2.0 * Math.PI) / z;
    const halfTooth = toothAngle / 2.0;

    // Involute function inv(phi) = tan(phi) - phi
    const inv = (phi) => Math.tan(phi) - phi;
    const psiPitch = Math.PI / (2.0 * z);      // Half angular tooth thickness at pitch circle
    const psiBase = psiPitch + inv(alpha);     // Half angular tooth thickness at base circle

    const thetaAtRadius = (rad) => {
      if (rad <= rb) return psiBase;
      const phi = Math.acos(Math.min(1.0, rb / rad));
      return psiBase - inv(phi);
    };

    // Guard against pointed/self-intersecting tips for small z and high pressure angle
    const minTipHalfAngle = 0.003;
    if (thetaAtRadius(ra) < minTipHalfAngle) {
      let lo = Math.max(rb, rf);
      let hi = ra;
      for (let iter = 0; iter < 24; iter++) {
        const mid = 0.5 * (lo + hi);
        if (thetaAtRadius(mid) > minTipHalfAngle) lo = mid;
        else hi = mid;
      }
      ra = lo;
    }

    const rFlankStart = Math.max(rb, rf);
    const rootFlankAngle = Math.min(psiBase, halfTooth * 0.90);
    const flankSteps = 6;
    const points = [];

    for (let i = 0; i < z; i++) {
      const centerAngle = i * toothAngle;

      // Root circle midpoint before rising flank
      if (rootFlankAngle < halfTooth * 0.94) {
        const aRootPrev = centerAngle - halfTooth;
        points.push(new THREE.Vector2(rf * Math.cos(aRootPrev), rf * Math.sin(aRootPrev)));
      }

      // Radial transition from root circle to base circle (when rf < rb)
      if (rf < rb) {
        const aRootStart = centerAngle - rootFlankAngle;
        points.push(new THREE.Vector2(rf * Math.cos(aRootStart), rf * Math.sin(aRootStart)));
      }

      // Rising involute flank (rFlankStart -> ra)
      for (let k = 0; k <= flankSteps; k++) {
        const t = k / flankSteps;
        const rad = rFlankStart + (ra - rFlankStart) * t;
        const theta = Math.max(minTipHalfAngle, thetaAtRadius(rad));
        const a = centerAngle - theta;
        points.push(new THREE.Vector2(rad * Math.cos(a), rad * Math.sin(a)));
      }

      // Tip circle center point (smooth rounded tip land)
      points.push(new THREE.Vector2(ra * Math.cos(centerAngle), ra * Math.sin(centerAngle)));

      // Falling involute flank (ra -> rFlankStart)
      for (let k = flankSteps; k >= 0; k--) {
        const t = k / flankSteps;
        const rad = rFlankStart + (ra - rFlankStart) * t;
        const theta = Math.max(minTipHalfAngle, thetaAtRadius(rad));
        const a = centerAngle + theta;
        points.push(new THREE.Vector2(rad * Math.cos(a), rad * Math.sin(a)));
      }

      // Radial transition from base circle back to root circle
      if (rf < rb) {
        const aRootEnd = centerAngle + rootFlankAngle;
        points.push(new THREE.Vector2(rf * Math.cos(aRootEnd), rf * Math.sin(aRootEnd)));
      }
    }

    const shape = new THREE.Shape();
    shape.setFromPoints(points);
    shape.closePath();

    // Clamp bore & hub safely inside gear root circle
    const maxSafeBoreR = Math.max(0.0, rf - Math.max(1.2, m * 0.5));
    const rBore = rawBore > 0 && maxSafeBoreR > 1.0 ? Math.min(rawBore / 2.0, maxSafeBoreR) : 0.0;

    // Determine effective hub radius (clamped within root circle and larger than bore)
    let rHub = 0.0;
    if (hasHub && hubLen > 0) {
      rHub = Math.min(rawHubDia / 2.0, rf);
      if (rHub <= rBore + 1.0) {
        rHub = 0.0;
      }
    }

    // Max allowable radial extent for keyway (must stay inside both gear root and hub if hub exists)
    const keywayLimitR = rHub > 0 ? Math.min(rf, rHub) : rf;
    const kwAvailableDepth = Math.max(0.0, keywayLimitR - rBore - 0.8);
    const useKeyway = hasKeyway && rBore > 1.5 && rawKwWidth > 0 && rawKwDepth > 0 && kwAvailableDepth >= 0.4;
    const kwWidth = useKeyway ? Math.min(rawKwWidth, rBore * 1.5) : 0.0;
    const kwDepth = useKeyway ? Math.min(rawKwDepth, kwAvailableDepth) : 0.0;

    if (rBore > 0) {
      shape.holes.push(this._createBorePath(rBore, useKeyway, kwWidth, kwDepth));
    }

    // Exact-dimension extrusion (no bevel inflation)
    const gearGeom = new THREE.ExtrudeGeometry(shape, {
      depth: b,
      bevelEnabled: false,
      steps: 1,
      curveSegments: 32
    });
    gearGeom.translate(0, 0, -b / 2.0);

    if (rHub <= 0) {
      gearGeom.computeVertexNormals();
      return gearGeom;
    }

    // Cylindrical hub on +Z face with matching broached bore + keyway
    const hubShape = new THREE.Shape();
    hubShape.absarc(0, 0, rHub, 0, Math.PI * 2, false);
    if (rBore > 0) {
      hubShape.holes.push(this._createBorePath(rBore, useKeyway, kwWidth, kwDepth));
    }

    const hubGeom = new THREE.ExtrudeGeometry(hubShape, {
      depth: hubLen,
      bevelEnabled: false,
      steps: 1,
      curveSegments: 36
    });
    hubGeom.translate(0, 0, b / 2.0);

    const merged = this._mergeBufferGeometries([gearGeom, hubGeom]);
    merged.computeVertexNormals();
    return merged;
  },

  /**
   * Helper: Create clockwise bore hole path with optional DIN 6885 top keyway
   */
  _createBorePath(rBore, hasKeyway, kwWidth, kwDepth) {
    const holePath = new THREE.Path();
    if (hasKeyway && kwWidth > 0 && kwDepth > 0) {
      const kwHalfW = Math.min(kwWidth / 2.0, rBore * 0.85);
      const yInt = Math.sqrt(Math.max(0.0, rBore * rBore - kwHalfW * kwHalfW));
      const yTop = rBore + kwDepth;
      const theta = Math.asin(Math.min(0.99, kwHalfW / rBore));
      const aRight = Math.PI / 2.0 - theta;
      const aLeft = Math.PI / 2.0 + theta;

      // Clockwise hole contour: top-left -> keyway top-left -> keyway top-right -> top-right -> CW arc around bottom
      holePath.moveTo(-kwHalfW, yInt);
      holePath.lineTo(-kwHalfW, yTop);
      holePath.lineTo(kwHalfW, yTop);
      holePath.lineTo(kwHalfW, yInt);
      holePath.absarc(0, 0, rBore, aRight, aLeft - Math.PI * 2.0, true);
    } else {
      holePath.absarc(0, 0, rBore, 0, Math.PI * 2.0, true);
    }
    return holePath;
  },

  /**
   * 2. Pipe Flange (EN 1092-1 / DIN weld-neck flange with bolt circle & raised face)
   */
  generatePipeFlange(params) {
    const dFlange = this._clamp(this._num(params.flangeDia, 165.0), 40.0, 500.0);
    const tFlange = this._clamp(this._num(params.flangeThick, 18.0), 4.0, 100.0);
    const dPipeIn = this._clamp(this._num(params.pipeInDia, 60.0), 8.0, dFlange - 16.0);
    const dPipeOut = this._clamp(this._num(params.pipeOutDia, 76.1), dPipeIn + 4.0, dFlange - 10.0);
    const hNeck = this._clamp(this._num(params.neckHeight, 35.0), 0.0, 200.0);
    const numBolts = this._clamp(Math.round(this._num(params.numBolts, 4)), 3, 24);
    const rawBoltHole = this._clamp(this._num(params.boltHoleDia, 18.0), 4.0, 50.0);
    const rawBC = this._clamp(this._num(params.boltCircleDia, 125.0), 20.0, dFlange - 4.0);
    const hasRaisedFace = params.hasRaisedFace !== false;
    const rawRF = this._clamp(this._num(params.raisedFaceDia, 110.0), 10.0, dFlange);
    const hRaisedFace = this._clamp(this._num(params.raisedFaceHeight, 3.0), 0.0, 30.0);

    const rFlange = dFlange / 2.0;
    const rPipeIn = dPipeIn / 2.0;
    const rPipeOut = dPipeOut / 2.0;

    // Validate bolt circle & bolt hole diameters so holes never hit pipe neck, outer edge, or each other
    const radialSpan = rFlange - rPipeOut;
    let rBolt = Math.min(rawBoltHole / 2.0, Math.max(0.0, radialSpan / 2.0 - 2.0));
    const minBC = rPipeOut + rBolt + 2.0;
    const maxBC = rFlange - rBolt - 2.0;
    const canPlaceBolts = rBolt >= 1.5 && maxBC >= minBC;
    const rBC = canPlaceBolts ? this._clamp(rawBC / 2.0, minBC, maxBC) : (rPipeOut + rFlange) / 2.0;

    if (canPlaceBolts) {
      const chordSpacing = 2.0 * rBC * Math.sin(Math.PI / numBolts);
      rBolt = Math.min(rBolt, chordSpacing * 0.42);
    }

    // 1. Main Flange Disc (z ∈ [0, tFlange])
    const discShape = new THREE.Shape();
    discShape.absarc(0, 0, rFlange, 0, Math.PI * 2, false);

    const centerHole = new THREE.Path();
    centerHole.absarc(0, 0, rPipeIn, 0, Math.PI * 2, true);
    discShape.holes.push(centerHole);

    if (canPlaceBolts && rBolt >= 1.5) {
      for (let i = 0; i < numBolts; i++) {
        const angle = (i * 2.0 * Math.PI) / numBolts;
        const bx = rBC * Math.cos(angle);
        const by = rBC * Math.sin(angle);
        const bHole = new THREE.Path();
        bHole.absarc(bx, by, rBolt, 0, Math.PI * 2, true);
        discShape.holes.push(bHole);
      }
    }

    const discGeom = new THREE.ExtrudeGeometry(discShape, {
      depth: tFlange,
      bevelEnabled: false,
      curveSegments: 48
    });

    const geoms = [discGeom];

    // 2. EN 1092-1 Tapered Welding Neck (z ∈ [tFlange, tFlange + hNeck])
    if (hNeck > 0 && rPipeOut > rPipeIn) {
      const boltInnerClearance = canPlaceBolts ? (rBC - rBolt - 2.5) : (rFlange - 4.0);
      const maxBaseR = Math.max(rPipeOut, Math.min(rPipeOut + Math.min(8.0, hNeck * 0.25), boltInnerClearance));
      const taperH = maxBaseR > rPipeOut + 0.4 ? Math.min(hNeck * 0.45, (maxBaseR - rPipeOut) * 2.2) : 0.0;
      const wallThick = rPipeOut - rPipeIn;
      const weldBevel = Math.min(1.5, wallThick * 0.35, hNeck * 0.2);

      const neckProfile = [
        new THREE.Vector2(rPipeIn, tFlange),
        new THREE.Vector2(maxBaseR, tFlange)
      ];
      if (taperH > 0.2) {
        neckProfile.push(new THREE.Vector2(rPipeOut, tFlange + taperH));
      }
      if (weldBevel > 0.2 && tFlange + hNeck - weldBevel > tFlange + taperH + 0.1) {
        neckProfile.push(new THREE.Vector2(rPipeOut, tFlange + hNeck - weldBevel));
        neckProfile.push(new THREE.Vector2(rPipeOut - weldBevel, tFlange + hNeck));
      } else {
        neckProfile.push(new THREE.Vector2(rPipeOut, tFlange + hNeck));
      }
      neckProfile.push(new THREE.Vector2(rPipeIn, tFlange + hNeck));
      neckProfile.push(new THREE.Vector2(rPipeIn, tFlange));

      const neckGeom = this._buildLatheWithSharpEdges(neckProfile, 48);
      neckGeom.rotateX(Math.PI / 2); // Align Lathe +Y to +Z
      geoms.push(neckGeom);
    }

    // 3. Raised Face on underside (z ∈ [-hRaisedFace, 0])
    const maxRFRadius = canPlaceBolts ? (rBC - rBolt - 2.0) : (rFlange - 2.0);
    const rRF = Math.min(rawRF / 2.0, maxRFRadius);
    if (hasRaisedFace && hRaisedFace > 0 && rRF > rPipeIn + 1.5) {
      const rfShape = new THREE.Shape();
      rfShape.absarc(0, 0, rRF, 0, Math.PI * 2, false);
      const rfHole = new THREE.Path();
      rfHole.absarc(0, 0, rPipeIn, 0, Math.PI * 2, true);
      rfShape.holes.push(rfHole);

      const rfGeom = new THREE.ExtrudeGeometry(rfShape, {
        depth: hRaisedFace,
        bevelEnabled: false,
        curveSegments: 48
      });
      rfGeom.translate(0, 0, -hRaisedFace);
      geoms.push(rfGeom);
    }

    const merged = this._mergeBufferGeometries(geoms);
    merged.computeVertexNormals();
    return merged;
  },

  /**
   * 3. Electronics Enclosure (Exact L x W x H, rounded corners & collision-free screw bosses)
   */
  generateEnclosure(params) {
    const l = this._clamp(this._num(params.length, 140.0), 30.0, 500.0);
    const w = this._clamp(this._num(params.width, 90.0), 30.0, 500.0);
    const h = this._clamp(this._num(params.height, 45.0), 10.0, 300.0);
    const wall = this._clamp(this._num(params.wallThickness, 3.0), 1.0, Math.min(l / 4.0, w / 4.0, h * 0.45));
    const rOut = this._clamp(this._num(params.cornerRadius, 8.0), 0.5, Math.min(l, w) / 2.0 - 1.0);
    const bossDia = this._clamp(this._num(params.bossDiameter, 10.0), 4.0, Math.min(l, w) / 4.0);
    const bossHole = this._clamp(this._num(params.bossHoleDia, 3.2), 1.0, bossDia - 1.6);

    const rIn = Math.max(0.5, rOut - wall);
    const wallHeight = h - wall;

    // 1. Hollow side walls (z ∈ [wall, h])
    const wallShape = new THREE.Shape();
    this._addRoundedRect(wallShape, -l / 2, -w / 2, l, w, rOut, false);

    const cavity = new THREE.Path();
    this._addRoundedRect(cavity, -l / 2 + wall, -w / 2 + wall, l - 2 * wall, w - 2 * wall, rIn, true);
    wallShape.holes.push(cavity);

    const bodyGeom = new THREE.ExtrudeGeometry(wallShape, {
      depth: wallHeight,
      bevelEnabled: false,
      curveSegments: 20
    });
    bodyGeom.translate(0, 0, wall);

    // 2. Flush bottom solid plate (z ∈ [0, wall]) — exact L x W x wall, no bevel lip
    const bottomShape = new THREE.Shape();
    this._addRoundedRect(bottomShape, -l / 2, -w / 2, l, w, rOut, false);
    const bottomGeom = new THREE.ExtrudeGeometry(bottomShape, {
      depth: wall,
      bevelEnabled: false,
      curveSegments: 20
    });

    const geoms = [bodyGeom, bottomGeom];

    // 3. 4 Corner Screw Bosses safely inset inside rounded inner corners
    const rBoss = bossDia / 2.0;
    const cornerClearance = 1.2;
    const insetForArc = rIn * (1.0 - Math.SQRT1_2) + (rBoss + cornerClearance) * Math.SQRT1_2;
    const inset = Math.max(rBoss + 1.5, insetForArc);
    const offsetBossX = l / 2.0 - wall - inset;
    const offsetBossY = w / 2.0 - wall - inset;

    if (offsetBossX > rBoss + 1.0 && offsetBossY > rBoss + 1.0) {
      const bossPositions = [
        [offsetBossX, offsetBossY],
        [-offsetBossX, offsetBossY],
        [-offsetBossX, -offsetBossY],
        [offsetBossX, -offsetBossY]
      ];

      bossPositions.forEach(([bx, by]) => {
        const bShape = new THREE.Shape();
        bShape.absarc(bx, by, rBoss, 0, Math.PI * 2, false);
        const bHole = new THREE.Path();
        bHole.absarc(bx, by, bossHole / 2.0, 0, Math.PI * 2, true);
        bShape.holes.push(bHole);

        const bGeom = new THREE.ExtrudeGeometry(bShape, {
          depth: wallHeight,
          bevelEnabled: false,
          curveSegments: 24
        });
        bGeom.translate(0, 0, wall);
        geoms.push(bGeom);
      });
    }

    const merged = this._mergeBufferGeometries(geoms);
    merged.computeVertexNormals();
    return merged;
  },

  /**
   * 4. Stepped Shaft (Multi-stepped shaft with crisp shoulders, chamfers & DIN 332 center holes)
   */
  generateSteppedShaft(params) {
    const d1 = this._clamp(this._num(params.dia1, 25.0), 4.0, 200.0);
    const l1 = this._clamp(this._num(params.len1, 30.0), 4.0, 200.0);
    const d2 = this._clamp(this._num(params.dia2, 35.0), 4.0, 200.0);
    const l2 = this._clamp(this._num(params.len2, 50.0), 4.0, 200.0);
    const d3 = this._clamp(this._num(params.dia3, 50.0), 4.0, 250.0);
    const l3 = this._clamp(this._num(params.len3, 25.0), 4.0, 200.0);
    const d4 = this._clamp(this._num(params.dia4, 35.0), 4.0, 200.0);
    const l4 = this._clamp(this._num(params.len4, 45.0), 4.0, 200.0);
    const rawChamfer = this._clamp(this._num(params.chamfer, 1.5), 0.0, 10.0);
    const rawCenterBore = this._clamp(this._num(params.centerBore, 6.0), 0.0, 30.0);

    const r1 = d1 / 2.0;
    const r2 = d2 / 2.0;
    const r3 = d3 / 2.0;
    const r4 = d4 / 2.0;

    // Clamp chamfer safely below lengths and radii
    const c1 = Math.min(rawChamfer, l1 * 0.4, r1 * 0.4);
    const c4 = Math.min(rawChamfer, l4 * 0.4, r4 * 0.4);

    // Clamp DIN 332 center hole radius cleanly inside both end faces
    const maxBoreR1 = Math.max(0.0, r1 - c1 - 0.8);
    const maxBoreR4 = Math.max(0.0, r4 - c4 - 0.8);
    const rBore1 = rawCenterBore > 0 ? Math.min(rawCenterBore / 2.0, maxBoreR1) : 0.0;
    const rBore4 = rawCenterBore > 0 ? Math.min(rawCenterBore / 2.0, maxBoreR4) : 0.0;

    const profile = [];
    let curZ = 0.0;

    // Entry face with true concave 60-degree DIN 332 center hole
    if (rBore1 > 0.25) {
      const coneDepth1 = Math.min(rBore1 * Math.sqrt(3), l1 * 0.55);
      profile.push(new THREE.Vector2(0, coneDepth1));
      profile.push(new THREE.Vector2(rBore1, curZ));
    } else {
      profile.push(new THREE.Vector2(0, curZ));
    }

    // Step 1 with entry chamfer
    if (c1 > 0.05) {
      profile.push(new THREE.Vector2(r1 - c1, curZ));
      curZ += c1;
    }
    profile.push(new THREE.Vector2(r1, curZ));
    curZ += (l1 - c1);
    profile.push(new THREE.Vector2(r1, curZ));

    // Step 2
    if (Math.abs(r2 - r1) > 1e-4) {
      profile.push(new THREE.Vector2(r2, curZ));
    }
    curZ += l2;
    profile.push(new THREE.Vector2(r2, curZ));

    // Step 3 (Main collar)
    if (Math.abs(r3 - r2) > 1e-4) {
      profile.push(new THREE.Vector2(r3, curZ));
    }
    curZ += l3;
    profile.push(new THREE.Vector2(r3, curZ));

    // Step 4 with exit chamfer
    if (Math.abs(r4 - r3) > 1e-4) {
      profile.push(new THREE.Vector2(r4, curZ));
    }
    curZ += (l4 - c4);
    profile.push(new THREE.Vector2(r4, curZ));

    if (c4 > 0.05) {
      curZ += c4;
      profile.push(new THREE.Vector2(r4 - c4, curZ));
    }

    // Exit face with matching concave DIN 332 center hole
    if (rBore4 > 0.25) {
      const coneDepth4 = Math.min(rBore4 * Math.sqrt(3), l4 * 0.55);
      profile.push(new THREE.Vector2(rBore4, curZ));
      profile.push(new THREE.Vector2(0, curZ - coneDepth4));
    } else {
      profile.push(new THREE.Vector2(0, curZ));
    }

    const latheGeom = this._buildLatheWithSharpEdges(profile, 48);
    // Orient horizontally along X axis
    latheGeom.rotateZ(-Math.PI / 2);
    latheGeom.translate(-curZ / 2.0, 0, 0);
    return latheGeom;
  },

  /**
   * 5. Hex Bolt & Nut (DIN 933 hex bolt with chamfered shank & positionable hex nut)
   */
  generateHexBolt(params) {
    const d = this._clamp(this._num(params.dia, 12.0), 3.0, 40.0);
    const lShaft = this._clamp(this._num(params.length, 55.0), 10.0, 250.0);
    // Guarantee hex width across flats is always safely larger than shaft diameter
    const minHex = Math.ceil(d * 1.25 + 2.0);
    const sHex = this._clamp(this._num(params.headWidth, 19.0), minHex, 80.0);
    const kHead = this._clamp(this._num(params.headHeight, 7.5), 2.0, 40.0);
    const hasNut = params.hasNut !== false;
    const rawNutPos = this._num(params.nutPosition, 35.0);

    const rShaft = d / 2.0;
    const rHex = sHex / Math.sqrt(3.0); // Circumradius of regular hexagon

    const makeHexShape = () => {
      const shape = new THREE.Shape();
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3.0;
        const x = rHex * Math.cos(a);
        const y = rHex * Math.sin(a);
        if (i === 0) shape.moveTo(x, y);
        else shape.lineTo(x, y);
      }
      shape.closePath();
      return shape;
    };

    // 1. Hex Bolt Head (z ∈ [-kHead, 0], exact sHex & kHead)
    const headGeom = new THREE.ExtrudeGeometry(makeHexShape(), {
      depth: kHead,
      bevelEnabled: false
    });
    headGeom.translate(0, 0, -kHead);

    // 2. Bolt Shaft with lead-in chamfer (z ∈ [0, lShaft])
    const tipChamfer = Math.min(1.4, rShaft * 0.28, lShaft * 0.15);
    const shaftProfile = [
      new THREE.Vector2(0, 0),
      new THREE.Vector2(rShaft, 0),
      new THREE.Vector2(rShaft, lShaft - tipChamfer),
      new THREE.Vector2(rShaft - tipChamfer, lShaft),
      new THREE.Vector2(0, lShaft)
    ];
    const shaftGeom = this._buildLatheWithSharpEdges(shaftProfile, 36);
    shaftGeom.rotateX(Math.PI / 2); // Align Lathe +Y to +Z

    const geoms = [headGeom, shaftGeom];

    // 3. Hex Nut (z ∈ [nutPos, nutPos + mNut], clean thread clearance)
    if (hasNut) {
      const mNut = Math.min(kHead * 0.85, lShaft * 0.55);
      const maxNutPos = Math.max(1.0, lShaft - mNut - tipChamfer - 0.5);
      const nutPos = this._clamp(rawNutPos, 1.0, maxNutPos);

      const nutShape = makeHexShape();
      const nutHole = new THREE.Path();
      const nutHoleR = Math.min(rShaft * 1.03, sHex / 2.0 - 0.8);
      nutHole.absarc(0, 0, nutHoleR, 0, Math.PI * 2, true);
      nutShape.holes.push(nutHole);

      const nutGeom = new THREE.ExtrudeGeometry(nutShape, {
        depth: mNut,
        bevelEnabled: false,
        curveSegments: 32
      });
      nutGeom.translate(0, 0, nutPos);
      geoms.push(nutGeom);
    }

    const merged = this._mergeBufferGeometries(geoms);
    merged.computeVertexNormals();
    return merged;
  },

  /**
   * Helper: Build a LatheGeometry with crisp normals across sharp (>25 deg) profile corners
   */
  _buildLatheWithSharpEdges(profile, segments = 48) {
    // Filter consecutive duplicate points
    const pts = [];
    for (let i = 0; i < profile.length; i++) {
      const p = profile[i];
      if (pts.length === 0 || p.distanceToSquared(pts[pts.length - 1]) > 1e-8) {
        pts.push(p);
      }
    }
    if (pts.length < 2) {
      return new THREE.LatheGeometry(pts, segments);
    }

    // Split profile into smooth chains separated at sharp turns
    const cosThreshold = Math.cos((25 * Math.PI) / 180);
    const chains = [];
    let current = [pts[0], pts[1]];

    for (let i = 2; i < pts.length; i++) {
      const prevDir = new THREE.Vector2().subVectors(pts[i - 1], pts[i - 2]).normalize();
      const nextDir = new THREE.Vector2().subVectors(pts[i], pts[i - 1]).normalize();
      if (prevDir.dot(nextDir) < cosThreshold) {
        chains.push(current);
        current = [pts[i - 1], pts[i]];
      } else {
        current.push(pts[i]);
      }
    }
    chains.push(current);

    const subGeoms = chains.map(chain => {
      const g = new THREE.LatheGeometry(chain, segments);
      g.computeVertexNormals();
      return g;
    });

    if (subGeoms.length === 1) return subGeoms[0];
    return this._mergeBufferGeometries(subGeoms);
  },

  /**
   * Helper: Add rounded rectangle to THREE.Shape / THREE.Path (CCW for outer, CW for holes)
   */
  _addRoundedRect(path, x, y, width, height, radius, clockwise = false) {
    const r = Math.min(radius, width / 2.0, height / 2.0);
    if (!clockwise) {
      path.moveTo(x + r, y);
      path.lineTo(x + width - r, y);
      path.quadraticCurveTo(x + width, y, x + width, y + r);
      path.lineTo(x + width, y + height - r);
      path.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
      path.lineTo(x + r, y + height);
      path.quadraticCurveTo(x, y + height, x, y + height - r);
      path.lineTo(x, y + r);
      path.quadraticCurveTo(x, y, x + r, y);
    } else {
      path.moveTo(x + r, y);
      path.quadraticCurveTo(x, y, x, y + r);
      path.lineTo(x, y + height - r);
      path.quadraticCurveTo(x, y + height, x + r, y + height);
      path.lineTo(x + width - r, y + height);
      path.quadraticCurveTo(x + width, y + height, x + width, y + height - r);
      path.lineTo(x + width, y + r);
      path.quadraticCurveTo(x + width, y, x + width - r, y);
      path.lineTo(x + r, y);
    }
  },

  /**
   * Helper: Concatenate array of BufferGeometries into a single mesh and dispose intermediates
   */
  _mergeBufferGeometries(geometries) {
    let totalPositions = 0;

    geometries.forEach(g => {
      if (!g.attributes.normal) g.computeVertexNormals();
      totalPositions += g.attributes.position.array.length;
    });

    const mergedPos = new Float32Array(totalPositions);
    const mergedNorm = new Float32Array(totalPositions);
    const mergedIndices = [];

    let posOffset = 0;
    let vertexCountAccum = 0;

    geometries.forEach(g => {
      const pos = g.attributes.position.array;
      mergedPos.set(pos, posOffset);

      if (g.attributes.normal) {
        mergedNorm.set(g.attributes.normal.array, posOffset);
      }

      if (g.index) {
        const idx = g.index.array;
        for (let i = 0; i < idx.length; i++) {
          mergedIndices.push(idx[i] + vertexCountAccum);
        }
      } else {
        const count = g.attributes.position.count;
        for (let i = 0; i < count; i++) {
          mergedIndices.push(i + vertexCountAccum);
        }
      }

      vertexCountAccum += g.attributes.position.count;
      posOffset += pos.length;

      // Release intermediate geometry buffers
      g.dispose();
    });

    const result = new THREE.BufferGeometry();
    result.setAttribute('position', new THREE.BufferAttribute(mergedPos, 3));
    result.setAttribute('normal', new THREE.BufferAttribute(mergedNorm, 3));
    result.setIndex(mergedIndices);
    return result;
  }
};
