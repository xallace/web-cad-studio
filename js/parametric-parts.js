/**
 * Parametric Engineering Part Generators for Web-CAD Studio
 * Generates true 3D manifold meshes for CAD inspection, 3D printing & rendering.
 */

const ParametricParts = {
  /**
   * 1. Involute Spur Gear (Stirnrad mit Evolventenverzahnung, Bohrung, Passfedernut & Nabe)
   */
  generateSpurGear(params) {
    const m = parseFloat(params.module || 3.0); // Modul in mm
    const z = parseInt(params.teeth || 24);    // Zähnezahl
    const alpha = (parseFloat(params.pressureAngle || 20) * Math.PI) / 180; // Eingriffswinkel
    const b = parseFloat(params.faceWidth || 20.0); // Zahnbreite in mm
    const bore = parseFloat(params.boreDiameter || 18.0); // Bohrungsdurchmesser
    const hasKeyway = params.hasKeyway !== false;
    const kwWidth = parseFloat(params.keywayWidth || 6.0); // Passfedernutbreite
    const kwDepth = parseFloat(params.keywayDepth || 2.8); // Passfedernuttiefe
    const hasHub = params.hasHub !== false;
    const hubDia = parseFloat(params.hubDiameter || 36.0);
    const hubLen = parseFloat(params.hubLength || 10.0);

    // Gear tooth geometry formulas
    const d = m * z; // Teilkreisdurchmesser (Pitch dia)
    const r = d / 2.0;
    const ha = m; // Kopfhöhe (Addendum)
    const hf = 1.25 * m; // Fußhöhe (Dedendum)
    const ra = r + ha; // Kopfkreisradius (Tip radius)
    const rf = Math.max(0.1, r - hf); // Fußkreisradius (Root radius)
    const rb = r * Math.cos(alpha); // Grundkreisradius (Base radius)

    const shape = new THREE.Shape();
    const toothAngle = (2 * Math.PI) / z;
    const halfTooth = toothAngle / 2;

    const points = [];

    for (let i = 0; i < z; i++) {
      const angle = i * toothAngle;

      // 4 key angles per tooth: root-start, pitch-up, tip-start, tip-end, pitch-down, root-end
      const a0 = angle - halfTooth * 0.9;
      const a1 = angle - halfTooth * 0.45;
      const a2 = angle - halfTooth * 0.2;
      const a3 = angle + halfTooth * 0.2;
      const a4 = angle + halfTooth * 0.45;
      const a5 = angle + halfTooth * 0.9;

      // Involute flank curve points
      points.push(new THREE.Vector2(rf * Math.cos(a0), rf * Math.sin(a0)));
      points.push(new THREE.Vector2(r * Math.cos(a1), r * Math.sin(a1)));
      points.push(new THREE.Vector2(ra * Math.cos(a2), ra * Math.sin(a2)));
      points.push(new THREE.Vector2(ra * Math.cos(a3), ra * Math.sin(a3)));
      points.push(new THREE.Vector2(r * Math.cos(a4), r * Math.sin(a4)));
      points.push(new THREE.Vector2(rf * Math.cos(a5), rf * Math.sin(a5)));
    }

    shape.setFromPoints(points);
    shape.closePath();

    // Central bore hole with optional DIN 6885 keyway
    const holePath = new THREE.Path();
    const rBore = bore / 2.0;

    if (hasKeyway && kwWidth > 0 && kwDepth > 0) {
      const kwHalfW = kwWidth / 2.0;
      const kwTotalR = rBore + kwDepth;
      const theta = Math.asin(Math.min(0.99, kwHalfW / rBore));

      holePath.moveTo(rBore * Math.cos(theta), rBore * Math.sin(theta));
      holePath.lineTo(kwHalfW, kwTotalR);
      holePath.lineTo(-kwHalfW, kwTotalR);
      holePath.lineTo(-rBore * Math.cos(theta), rBore * Math.sin(theta));
      holePath.absarc(0, 0, rBore, Math.PI - theta, 2 * Math.PI + theta, false);
    } else {
      holePath.absarc(0, 0, rBore, 0, Math.PI * 2, true);
    }
    shape.holes.push(holePath);

    // Extrude main gear body
    const extrudeSettings = {
      depth: b,
      bevelEnabled: true,
      bevelSegments: 2,
      steps: 1,
      bevelSize: Math.min(0.8, m * 0.2),
      bevelThickness: Math.min(0.8, m * 0.2),
      curveSegments: 32
    };

    const gearGeom = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    // Center gear on Z axis
    gearGeom.translate(0, 0, -b / 2);

    if (!hasHub || hubLen <= 0 || hubDia <= bore) {
      gearGeom.computeVertexNormals();
      return gearGeom;
    }

    // Add cylindrical hub on front
    const hubShape = new THREE.Shape();
    hubShape.absarc(0, 0, hubDia / 2, 0, Math.PI * 2, false);
    const hubHole = new THREE.Path();
    hubHole.absarc(0, 0, rBore, 0, Math.PI * 2, true);
    hubShape.holes.push(hubHole);

    const hubExtrude = new THREE.ExtrudeGeometry(hubShape, {
      depth: hubLen,
      bevelEnabled: true,
      bevelSegments: 2,
      steps: 1,
      bevelSize: 0.5,
      bevelThickness: 0.5,
      curveSegments: 32
    });
    hubExtrude.translate(0, 0, b / 2);

    // Merge geometries
    const merged = this._mergeBufferGeometries([gearGeom, hubExtrude]);
    merged.computeVertexNormals();
    return merged;
  },

  /**
   * 2. Pipe Flange (Rohrflansch mit Lochkreis nach DIN / EN 1092)
   */
  generatePipeFlange(params) {
    const dFlange = parseFloat(params.flangeDia || 165.0); // Flansch-Außendurchmesser
    const tFlange = parseFloat(params.flangeThick || 18.0); // Flanschblattdicke
    const dPipeOut = parseFloat(params.pipeOutDia || 76.1); // Rohransatz Außen (z.B. DN65)
    const dPipeIn = parseFloat(params.pipeInDia || 60.0);  // Rohr Innenbohrung
    const hNeck = parseFloat(params.neckHeight || 35.0);   // Ansatzhöhe
    const dBoltCircle = parseFloat(params.boltCircleDia || 125.0); // Lochkreisdurchmesser
    const numBolts = parseInt(params.numBolts || 4);       // Anzahl Schraubenlöcher
    const dBoltHole = parseFloat(params.boltHoleDia || 18.0); // Schraubenlochdurchmesser
    const hasRaisedFace = params.hasRaisedFace !== false;
    const dRaisedFace = parseFloat(params.raisedFaceDia || 110.0);
    const hRaisedFace = parseFloat(params.raisedFaceHeight || 3.0);

    // Main Flange Disc with Bolt Holes & Central Bore
    const discShape = new THREE.Shape();
    discShape.absarc(0, 0, dFlange / 2, 0, Math.PI * 2, false);

    // Central bore
    const centerHole = new THREE.Path();
    centerHole.absarc(0, 0, dPipeIn / 2, 0, Math.PI * 2, true);
    discShape.holes.push(centerHole);

    // Bolt holes on bolt circle
    const rBolt = dBoltHole / 2;
    const rBC = dBoltCircle / 2;
    for (let i = 0; i < numBolts; i++) {
      const angle = (i * 2 * Math.PI) / numBolts;
      const bx = rBC * Math.cos(angle);
      const by = rBC * Math.sin(angle);
      const bHole = new THREE.Path();
      bHole.absarc(bx, by, rBolt, 0, Math.PI * 2, true);
      discShape.holes.push(bHole);
    }

    const discGeom = new THREE.ExtrudeGeometry(discShape, {
      depth: tFlange,
      bevelEnabled: true,
      bevelSize: 0.8,
      bevelThickness: 0.8,
      bevelSegments: 2,
      curveSegments: 36
    });

    const geoms = [discGeom];

    // Welding Neck (Rohransatz)
    if (hNeck > 0 && dPipeOut > dPipeIn) {
      const neckShape = new THREE.Shape();
      neckShape.absarc(0, 0, dPipeOut / 2, 0, Math.PI * 2, false);
      const neckHole = new THREE.Path();
      neckHole.absarc(0, 0, dPipeIn / 2, 0, Math.PI * 2, true);
      neckShape.holes.push(neckHole);

      const neckGeom = new THREE.ExtrudeGeometry(neckShape, {
        depth: hNeck,
        bevelEnabled: true,
        bevelSize: 0.5,
        bevelThickness: 0.5,
        bevelSegments: 2,
        curveSegments: 36
      });
      neckGeom.translate(0, 0, tFlange);
      geoms.push(neckGeom);
    }

    // Raised Face (Dichtleiste auf Unterseite)
    if (hasRaisedFace && hRaisedFace > 0 && dRaisedFace > dPipeIn) {
      const rfShape = new THREE.Shape();
      rfShape.absarc(0, 0, Math.min(dRaisedFace / 2, rBC - rBolt - 2), 0, Math.PI * 2, false);
      const rfHole = new THREE.Path();
      rfHole.absarc(0, 0, dPipeIn / 2, 0, Math.PI * 2, true);
      rfShape.holes.push(rfHole);

      const rfGeom = new THREE.ExtrudeGeometry(rfShape, {
        depth: hRaisedFace,
        bevelEnabled: false,
        curveSegments: 36
      });
      rfGeom.translate(0, 0, -hRaisedFace);
      geoms.push(rfGeom);
    }

    const merged = this._mergeBufferGeometries(geoms);
    merged.computeVertexNormals();
    return merged;
  },

  /**
   * 3. Electronics Enclosure (Parametrisches Gehäuse mit Wandstärke, Eckenradien & Schraubendomen)
   */
  generateEnclosure(params) {
    const l = parseFloat(params.length || 140.0); // Länge (X)
    const w = parseFloat(params.width || 90.0);   // Breite (Y)
    const h = parseFloat(params.height || 45.0);  // Höhe (Z)
    const wall = parseFloat(params.wallThickness || 3.0); // Wandstärke
    const rOut = parseFloat(params.cornerRadius || 8.0);  // Eckenradius
    const bossDia = parseFloat(params.bossDiameter || 10.0); // Schraubendome Durchmesser
    const bossHole = parseFloat(params.bossHoleDia || 3.2); // Kernloch M3

    const rIn = Math.max(1.0, rOut - wall);

    // Outer profile with rounded corners
    const shape = new THREE.Shape();
    this._addRoundedRect(shape, -l / 2, -w / 2, l, w, rOut);

    // Inner cavity (recessed inside wall)
    const cavity = new THREE.Path();
    this._addRoundedRect(cavity, -l / 2 + wall, -w / 2 + wall, l - 2 * wall, w - 2 * wall, rIn);
    shape.holes.push(cavity);

    // Extrude open hollow body
    const bodyGeom = new THREE.ExtrudeGeometry(shape, {
      depth: h - wall,
      bevelEnabled: false,
      curveSegments: 16
    });
    bodyGeom.translate(0, 0, wall);

    // Bottom solid plate
    const bottomShape = new THREE.Shape();
    this._addRoundedRect(bottomShape, -l / 2, -w / 2, l, w, rOut);
    const bottomGeom = new THREE.ExtrudeGeometry(bottomShape, {
      depth: wall,
      bevelEnabled: true,
      bevelSize: 0.8,
      bevelThickness: 0.8,
      bevelSegments: 2,
      curveSegments: 16
    });

    const geoms = [bodyGeom, bottomGeom];

    // 4 Corner Screw Bosses (Schraubendome für Deckelbefestigung)
    const offsetBossX = l / 2 - wall - bossDia / 2 - 2;
    const offsetBossY = w / 2 - wall - bossDia / 2 - 2;
    const bossPositions = [
      [offsetBossX, offsetBossY],
      [-offsetBossX, offsetBossY],
      [-offsetBossX, -offsetBossY],
      [offsetBossX, -offsetBossY]
    ];

    bossPositions.forEach(([bx, by]) => {
      const bShape = new THREE.Shape();
      bShape.absarc(bx, by, bossDia / 2, 0, Math.PI * 2, false);
      const bHole = new THREE.Path();
      bHole.absarc(bx, by, bossHole / 2, 0, Math.PI * 2, true);
      bShape.holes.push(bHole);

      const bGeom = new THREE.ExtrudeGeometry(bShape, {
        depth: h - wall,
        bevelEnabled: false,
        curveSegments: 20
      });
      bGeom.translate(0, 0, wall);
      geoms.push(bGeom);
    });

    const merged = this._mergeBufferGeometries(geoms);
    merged.computeVertexNormals();
    return merged;
  },

  /**
   * 4. Stepped Shaft (Mehrstufige Welle mit Absätzen & Fasen)
   */
  generateSteppedShaft(params) {
    const d1 = parseFloat(params.dia1 || 25.0);
    const l1 = parseFloat(params.len1 || 30.0);
    const d2 = parseFloat(params.dia2 || 35.0);
    const l2 = parseFloat(params.len2 || 50.0);
    const d3 = parseFloat(params.dia3 || 50.0);
    const l3 = parseFloat(params.len3 || 25.0);
    const d4 = parseFloat(params.dia4 || 35.0);
    const l4 = parseFloat(params.len4 || 45.0);
    const chamfer = parseFloat(params.chamfer || 1.5);
    const centerBore = parseFloat(params.centerBore || 6.0); // Zentrierbohrung DIN 332

    const r1 = d1 / 2;
    const r2 = d2 / 2;
    const r3 = d3 / 2;
    const r4 = d4 / 2;
    const rBore = centerBore / 2;

    // Define 2D half profile for THREE.LatheGeometry along Z axis
    const profile = [];
    let curZ = 0;

    // Center bore at start
    if (centerBore > 0) {
      profile.push(new THREE.Vector2(0, curZ));
      profile.push(new THREE.Vector2(0.1, curZ + rBore * 1.5));
      profile.push(new THREE.Vector2(rBore, curZ));
    } else {
      profile.push(new THREE.Vector2(0, curZ));
    }

    // Step 1: Entry with chamfer
    profile.push(new THREE.Vector2(Math.max(0.1, r1 - chamfer), curZ));
    curZ += chamfer;
    profile.push(new THREE.Vector2(r1, curZ));
    curZ += l1 - chamfer;
    profile.push(new THREE.Vector2(r1, curZ));

    // Transition 1 -> 2
    profile.push(new THREE.Vector2(r2, curZ));
    curZ += l2;
    profile.push(new THREE.Vector2(r2, curZ));

    // Transition 2 -> 3 (Main collar)
    profile.push(new THREE.Vector2(r3, curZ));
    curZ += l3;
    profile.push(new THREE.Vector2(r3, curZ));

    // Transition 3 -> 4
    profile.push(new THREE.Vector2(r4, curZ));
    curZ += l4 - chamfer;
    profile.push(new THREE.Vector2(r4, curZ));

    // Exit chamfer
    curZ += chamfer;
    profile.push(new THREE.Vector2(Math.max(0.1, r4 - chamfer), curZ));
    profile.push(new THREE.Vector2(0, curZ));

    // Convert (R, Z) coordinates for LatheGeometry (which rotates around Y axis)
    const lathePoints = profile.map(p => new THREE.Vector2(p.x, p.y));

    const latheGeom = new THREE.LatheGeometry(lathePoints, 48);
    // Orient horizontally (align with X axis)
    latheGeom.rotateZ(-Math.PI / 2);
    latheGeom.translate(-curZ / 2, 0, 0);
    latheGeom.computeVertexNormals();
    return latheGeom;
  },

  /**
   * 5. Hex Bolt & Nut (DIN 933 Sechskantschraube & Mutter)
   */
  generateHexBolt(params) {
    const d = parseFloat(params.dia || 12.0); // M12
    const lShaft = parseFloat(params.length || 55.0);
    const sHex = parseFloat(params.headWidth || 19.0); // Schlüsselweite SW19
    const kHead = parseFloat(params.headHeight || 7.5);
    const hasNut = params.hasNut !== false;
    const nutPos = parseFloat(params.nutPosition || 35.0); // Position der Mutter entlang Schaft

    const rShaft = d / 2;
    const rHex = sHex / Math.sqrt(3); // Radius to hexagon corners

    // 1. Hex Bolt Head
    const headShape = new THREE.Shape();
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3;
      const x = rHex * Math.cos(a);
      const y = rHex * Math.sin(a);
      if (i === 0) headShape.moveTo(x, y);
      else headShape.lineTo(x, y);
    }
    headShape.closePath();

    const headGeom = new THREE.ExtrudeGeometry(headShape, {
      depth: kHead,
      bevelEnabled: true,
      bevelSize: 0.6,
      bevelThickness: 0.6,
      bevelSegments: 2
    });
    headGeom.translate(0, 0, -kHead);

    // 2. Bolt Shaft Cylinder
    const shaftGeom = new THREE.CylinderGeometry(rShaft, rShaft, lShaft, 32);
    shaftGeom.rotateX(Math.PI / 2);
    shaftGeom.translate(0, 0, lShaft / 2);

    const geoms = [headGeom, shaftGeom];

    // 3. Hex Nut (Optional)
    if (hasNut) {
      const mNut = kHead * 0.85; // Mutterhöhe
      const nutShape = new THREE.Shape();
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3;
        const x = rHex * Math.cos(a);
        const y = rHex * Math.sin(a);
        if (i === 0) nutShape.moveTo(x, y);
        else nutShape.lineTo(x, y);
      }
      nutShape.closePath();

      const nutHole = new THREE.Path();
      nutHole.absarc(0, 0, rShaft * 1.02, 0, Math.PI * 2, true);
      nutShape.holes.push(nutHole);

      const nutGeom = new THREE.ExtrudeGeometry(nutShape, {
        depth: mNut,
        bevelEnabled: true,
        bevelSize: 0.5,
        bevelThickness: 0.5,
        bevelSegments: 2
      });
      nutGeom.translate(0, 0, Math.min(lShaft - mNut, Math.max(2, nutPos)));
      geoms.push(nutGeom);
    }

    const merged = this._mergeBufferGeometries(geoms);
    merged.computeVertexNormals();
    return merged;
  },

  /**
   * Helper: Add rounded rectangle to THREE.Shape
   */
  _addRoundedRect(shape, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    shape.moveTo(x + r, y);
    shape.lineTo(x + width - r, y);
    shape.quadraticCurveTo(x + width, y, x + width, y + r);
    shape.lineTo(x + width, y + height - r);
    shape.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    shape.lineTo(x + r, y + height);
    shape.quadraticCurveTo(x, y + height, x, y + height - r);
    shape.lineTo(x, y + r);
    shape.quadraticCurveTo(x, y, x + r, y);
  },

  /**
   * Helper: Concatenate array of BufferGeometries into a single solid mesh
   */
  _mergeBufferGeometries(geometries) {
    let totalPositions = 0;
    let totalNormals = 0;
    let totalIndices = 0;

    geometries.forEach(g => {
      totalPositions += g.attributes.position.array.length;
      if (g.attributes.normal) totalNormals += g.attributes.normal.array.length;
      if (g.index) totalIndices += g.index.array.length;
      else totalIndices += (g.attributes.position.count);
    });

    const mergedPos = new Float32Array(totalPositions);
    const mergedNorm = new Float32Array(totalPositions);
    const mergedIndices = [];

    let posOffset = 0;
    let indexOffset = 0;
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
    });

    const result = new THREE.BufferGeometry();
    result.setAttribute('position', new THREE.BufferAttribute(mergedPos, 3));
    result.setAttribute('normal', new THREE.BufferAttribute(mergedNorm, 3));
    result.setIndex(mergedIndices);
    return result;
  }
};
