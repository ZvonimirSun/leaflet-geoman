import Draw from './L.PM.Draw';
import { getTranslation } from '../helpers';

Draw.Polygon = Draw.Line.extend({
  initialize(map) {
    this._map = map;
    this._shape = 'Polygon';
    this.toolbarButtonName = 'drawPolygon';
  },
  enable(options) {
    L.PM.Draw.Line.prototype.enable.call(this, options);

    // sync the closeline with hint marker
    if (this.options.closedPolygonEdge) {
      this._closeLine = L.polyline([], this.options.hintlineStyle);
      this._setPane(this._closeLine, 'layerPane');
      this._closeLine._pmTempLayer = true;
      this._layerGroup.addLayer(this._closeLine);
      this._hintMarker.on('move', this._syncCloseLine, this);
    }
    // Overwrite the shape "Line" of this._layer
    this._layer.pm._shape = 'Polygon';
  },
  _createMarker(latlng) {
    // create the new marker
    const marker = new L.Marker(latlng, {
      draggable: false,
      icon: L.divIcon({ className: 'marker-icon' }),
    });
    this._setPane(marker, 'vertexPane');

    // mark this marker as temporary
    marker._pmTempLayer = true;

    // add it to the map
    this._layerGroup.addLayer(marker);
    this._markers.push(marker);

    // if the first marker gets clicked again, finish this shape
    if (this._layer.getLatLngs().flat().length === 1) {
      marker.on('click', this._finishShape, this);

      // add the first vertex to "other snapping layers" so the polygon is easier to finish
      this._tempSnapLayerIndex = this._otherSnapLayers.push(marker) - 1;

      if (this.options.snappable) {
        this._cleanupSnapping();
      }
    } else {
      // add a click event w/ no handler to the marker
      // event won't bubble so prevents creation of identical markers in same polygon
      // fixes issue where double click during poly creation when allowSelfIntersection: false caused it to break
      marker.on('click', () => 1);
    }

    return marker;
  },
  _setTooltipText() {
    const { length } = this._layer.getLatLngs().flat();
    let text = '';

    // handle tooltip text
    if (length <= 2) {
      text = getTranslation('tooltips.continueLine');
    } else {
      text = getTranslation('tooltips.finishPoly');
    }
    this._hintMarker.setTooltipContent(text);
  },
  _syncCloseLine() {
    const polyPoints = this._layer.getLatLngs();

    if (polyPoints.length > 1) {
      const firstPolygonPoint = polyPoints[0];

      // set coords for closeline from marker to first vertex of drawin polyline
      this._closeLine.setLatLngs([
        firstPolygonPoint,
        this._hintMarker.getLatLng(),
      ]);
    }
  },
  _handleSelfIntersection(addVertex, latlng) {
    L.PM.Draw.Line.prototype._handleSelfIntersection.call(
      this,
      addVertex,
      latlng
    );
    if (!this.options.closedPolygonEdge) {
      return;
    }

    // change the style based on self intersection
    if (this._doesSelfIntersect) {
      this._closeLine.setStyle({
        color: '#f00000ff',
      });
    } else if (!this._closeLine.isEmpty()) {
      this._closeLine.setStyle(this.options.hintlineStyle);
    }
  },
  _createVertex(e) {
    L.PM.Draw.Line.prototype._createVertex.call(this, e);

    // get coordinate for new vertex by hintMarker (cursor marker)
    const latlng = this._hintMarker.getLatLng();

    if (this.options.closedPolygonEdge) {
      this._setCloseLineAfterNewVertex(latlng);
    }
  },
  _setCloseLineAfterNewVertex(hintMarkerLatLng) {
    // make the new drawn line (with another style) visible
    const polyPoints = this._layer.getLatLngs();
    if (polyPoints.length > 1) {
      const firstPolygonPoint = polyPoints[0];
      this._closeLine.setLatLngs([hintMarkerLatLng, firstPolygonPoint]);
    }
  },
  _removeLastVertex() {
    L.PM.Draw.Line.prototype._removeLastVertex.call(this);

    // sync the closeline again
    if (this.options.closedPolygonEdge) {
      this._syncCloseLine();
    }
  },
  _finishShape() {
    // if self intersection is not allowed, do not finish the shape!
    if (!this.options.allowSelfIntersection) {
      // Check if polygon intersects when is completed and the line between the last and the first point is drawn
      this._handleSelfIntersection(true, this._layer.getLatLngs()[0]);

      if (this._doesSelfIntersect) {
        return;
      }
    }

    // If snap finish is required but the last marker wasn't snapped, do not finish the shape!
    if (
      this.options.requireSnapToFinish &&
      !this._hintMarker._snapped &&
      !this._isFirstLayer()
    ) {
      return;
    }

    // get coordinates
    const coords = this._layer.getLatLngs();

    // only finish the shape if there are 3 or more vertices
    if (coords.length <= 2) {
      return;
    }

    const polygonLayer = L.polygon(coords, this.options.pathOptions);
    this._setPane(polygonLayer, 'layerPane');
    this._finishLayer(polygonLayer);
    polygonLayer.addTo(this._map.pm._getContainingLayer());

    // fire the pm:create event and pass shape and layer
    this._fireCreate(polygonLayer);

    // clean up snapping states
    this._cleanupSnapping();

    // remove the first vertex from "other snapping layers"
    this._otherSnapLayers.splice(this._tempSnapLayerIndex, 1);
    delete this._tempSnapLayerIndex;

    const hintMarkerLatLng = this._hintMarker.getLatLng();

    // disable drawing
    this.disable();
    if (this.options.continueDrawing) {
      this.enable();
      this._hintMarker.setLatLng(hintMarkerLatLng);
    }
  },
  setStyle() {
    L.PM.Draw.Line.prototype.setStyle.call(this);
    this._closeLine?.setStyle(this.options.hintlineStyle);
  },
});
