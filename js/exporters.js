/**
 * CAD Exporter utilities for Web-CAD Studio
 * Supports Binary STL (3D Printing), ASCII STL & Wavefront OBJ
 */

const CADExporters = {
  /**
   * Export Binary STL file
   * Standard format for 3D Slicers (PrusaSlicer, Cura, Bambu Studio)
   */
  exportBinarySTL(geometry, filename = 'cad-model.stl') {
    const geom = geometry.index ? geometry.toNonIndexed() : geometry.clone();
    const pos = geom.attributes.position.array;
    const triangles = pos.length / 9;

    const bufferSize = 84 + (50 * triangles);
    const buffer = new ArrayBuffer(bufferSize);
    const view = new DataView(buffer);

    // 80-byte header
    const headerStr = 'Exported from Web-CAD Studio (Parametric 3D Engineering Tool)';
    for (let i = 0; i < 80; i++) {
      view.setUint8(i, i < headerStr.length ? headerStr.charCodeAt(i) : 32);
    }

    // Number of triangles (uint32)
    view.setUint32(80, triangles, true);

    let offset = 84;
    const pA = new THREE.Vector3();
    const pB = new THREE.Vector3();
    const pC = new THREE.Vector3();
    const cb = new THREE.Vector3();
    const ab = new THREE.Vector3();
    const normal = new THREE.Vector3();

    for (let i = 0; i < pos.length; i += 9) {
      pA.set(pos[i], pos[i + 1], pos[i + 2]);
      pB.set(pos[i + 3], pos[i + 4], pos[i + 5]);
      pC.set(pos[i + 6], pos[i + 7], pos[i + 8]);

      // Calculate facet normal
      cb.subVectors(pC, pB);
      ab.subVectors(pA, pB);
      cb.cross(ab).normalize();
      normal.copy(cb);

      // Normal vector
      view.setFloat32(offset, normal.x, true);
      view.setFloat32(offset + 4, normal.y, true);
      view.setFloat32(offset + 8, normal.z, true);
      offset += 12;

      // Vertex 1
      view.setFloat32(offset, pA.x, true);
      view.setFloat32(offset + 4, pA.y, true);
      view.setFloat32(offset + 8, pA.z, true);
      offset += 12;

      // Vertex 2
      view.setFloat32(offset, pB.x, true);
      view.setFloat32(offset + 4, pB.y, true);
      view.setFloat32(offset + 8, pB.z, true);
      offset += 12;

      // Vertex 3
      view.setFloat32(offset, pC.x, true);
      view.setFloat32(offset + 4, pC.y, true);
      view.setFloat32(offset + 8, pC.z, true);
      offset += 12;

      // Attribute byte count (uint16 = 0)
      view.setUint16(offset, 0, true);
      offset += 2;
    }

    const blob = new Blob([buffer], { type: 'application/octet-stream' });
    this._downloadBlob(blob, filename.endsWith('.stl') ? filename : filename + '.stl');
  },

  /**
   * Export Wavefront OBJ format
   */
  exportOBJ(geometry, filename = 'cad-model.obj') {
    const geom = geometry.index ? geometry.toNonIndexed() : geometry.clone();
    const pos = geom.attributes.position.array;
    const norm = geom.attributes.normal ? geom.attributes.normal.array : null;

    let output = '# Exported from Web-CAD Studio\n';
    output += `# Vertices: ${pos.length / 3}\n`;
    output += 'o CAD_Object\n\n';

    // Vertices
    for (let i = 0; i < pos.length; i += 3) {
      output += `v ${pos[i].toFixed(4)} ${pos[i + 1].toFixed(4)} ${pos[i + 2].toFixed(4)}\n`;
    }

    // Normals
    if (norm) {
      for (let i = 0; i < norm.length; i += 3) {
        output += `vn ${norm[i].toFixed(4)} ${norm[i + 1].toFixed(4)} ${norm[i + 2].toFixed(4)}\n`;
      }
    }

    // Faces (1-indexed)
    output += '\ns 1\n';
    const totalVerts = pos.length / 3;
    for (let i = 1; i <= totalVerts; i += 3) {
      if (norm) {
        output += `f ${i}//${i} ${i + 1}//${i + 1} ${i + 2}//${i + 2}\n`;
      } else {
        output += `f ${i} ${i + 1} ${i + 2}\n`;
      }
    }

    const blob = new Blob([output], { type: 'text/plain' });
    this._downloadBlob(blob, filename.endsWith('.obj') ? filename : filename + '.obj');
  },

  _downloadBlob(blob, filename) {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  }
};
