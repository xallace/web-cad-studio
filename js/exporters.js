/**
 * CAD Exporter utilities for Web-CAD Studio
 * Supports Binary STL (3D Printing) & Wavefront OBJ
 */

const CADExporters = {
  /**
   * Export Binary STL file
   * Standard format for 3D Slicers (PrusaSlicer, Cura, Bambu Studio)
   */
  exportBinarySTL(geometry, filename = 'cad-model.stl') {
    if (!geometry || !geometry.attributes.position) return;

    const geom = geometry.index ? geometry.toNonIndexed() : geometry.clone();
    try {
      const pos = geom.attributes.position.array;
      const triangles = Math.floor(pos.length / 9);
      if (triangles <= 0) return;

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

      for (let i = 0; i < triangles * 9; i += 9) {
        pA.set(pos[i], pos[i + 1], pos[i + 2]);
        pB.set(pos[i + 3], pos[i + 4], pos[i + 5]);
        pC.set(pos[i + 6], pos[i + 7], pos[i + 8]);

        // Facet outward normal = (pB - pA) x (pC - pA) = (pC - pB) x (pA - pB)
        cb.subVectors(pC, pB);
        ab.subVectors(pA, pB);
        cb.cross(ab).normalize();

        // Normal vector
        view.setFloat32(offset, cb.x, true);
        view.setFloat32(offset + 4, cb.y, true);
        view.setFloat32(offset + 8, cb.z, true);
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
      this._downloadBlob(blob, filename.endsWith('.stl') ? filename : `${filename}.stl`);
    } finally {
      geom.dispose();
    }
  },

  /**
   * Export Wavefront OBJ format
   */
  exportOBJ(geometry, filename = 'cad-model.obj') {
    if (!geometry || !geometry.attributes.position) return;

    const geom = geometry.index ? geometry.toNonIndexed() : geometry.clone();
    try {
      const pos = geom.attributes.position.array;
      const norm = geom.attributes.normal ? geom.attributes.normal.array : null;
      const totalVerts = Math.floor(pos.length / 3);
      if (totalVerts < 3) return;

      const lines = [
        '# Exported from Web-CAD Studio',
        `# Vertices: ${totalVerts}`,
        'o CAD_Object',
        ''
      ];

      // Vertices
      for (let i = 0; i < totalVerts * 3; i += 3) {
        lines.push(`v ${pos[i].toFixed(4)} ${pos[i + 1].toFixed(4)} ${pos[i + 2].toFixed(4)}`);
      }

      // Normals
      if (norm) {
        for (let i = 0; i < totalVerts * 3; i += 3) {
          lines.push(`vn ${norm[i].toFixed(4)} ${norm[i + 1].toFixed(4)} ${norm[i + 2].toFixed(4)}`);
        }
      }

      // Faces (1-indexed)
      lines.push('', 's 1');
      for (let i = 1; i + 2 <= totalVerts; i += 3) {
        if (norm) {
          lines.push(`f ${i}//${i} ${i + 1}//${i + 1} ${i + 2}//${i + 2}`);
        } else {
          lines.push(`f ${i} ${i + 1} ${i + 2}`);
        }
      }

      const blob = new Blob([lines.join('\n') + '\n'], { type: 'text/plain' });
      this._downloadBlob(blob, filename.endsWith('.obj') ? filename : `${filename}.obj`);
    } finally {
      geom.dispose();
    }
  },

  _downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    // Defer revoke so browsers never cancel large blob downloads
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
};
