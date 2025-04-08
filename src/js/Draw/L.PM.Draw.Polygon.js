import kinks from '@turf/kinks';
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
    // ok we need to check the self intersection here
    // problem: during draw, the marker on the cursor is not yet part
    // of the layer. So we need to clone the layer, add the
    // potential new vertex (cursor markers latlngs) and check the self
    // intersection on the clone. Phew... - let's do it 💪

    // clone layer (polyline is enough, even when it's a polygon)
    const clone = L.polyline(this._layer.getLatLngs());

    if (addVertex) {
      // get vertex from param or from hintmarker
      if (!latlng) {
        latlng = this._hintMarker.getLatLng();
      }

      // add the vertex
      clone.addLatLng(latlng);
    }

    // check the self intersection
    const selfIntersection = kinks(clone.toGeoJSON(15));
    this._doesSelfIntersect = selfIntersection.features.length > 0;

    // change the style based on self intersection
    if (this._doesSelfIntersect) {
      if (!this.isRed) {
        this.isRed = true;
        this._hintline.setStyle({
          color: '#f00000ff',
        });
        if (this.options.closedPolygonEdge) {
          this._closeLine.setStyle({
            color: '#f00000ff',
          });
        }
        // fire intersect event
        this._fireIntersect(selfIntersection, this._map, 'Draw');
      }
    } else if (!this._hintline.isEmpty()) {
      this.isRed = false;
      this._hintline.setStyle(this.options.hintlineStyle);
      if (this.options.closedPolygonEdge) {
        this._closeLine.setStyle(this.options.hintlineStyle);
      }
    }
  },
  _createVertex(e) {
    // don't create a vertex if we have a selfIntersection and it is not allowed
    if (!this.options.allowSelfIntersection) {
      this._handleSelfIntersection(true, e.latlng);

      if (this._doesSelfIntersect) {
        return;
      }
    }

    // assign the coordinate of the click to the hintMarker, that's necessary for
    // mobile where the marker can't follow a cursor
    if (!this._hintMarker._snapped) {
      this._hintMarker.setLatLng(e.latlng);
    }

    // get coordinate for new vertex by hintMarker (cursor marker)
    const latlng = this._hintMarker.getLatLng();

    // check if the first and this vertex have the same latlng
    // or the last vertex and the hintMarker have the same latlng (dbl-click)
    const latlngs = this._layer.getLatLngs();

    const lastLatLng = latlngs[latlngs.length - 1];
    if (
      latlng.equals(latlngs[0]) ||
      (latlngs.length > 0 && latlng.equals(lastLatLng))
    ) {
      // yes? finish the polygon
      this._finishShape();

      // "why?", you ask? Because this happens when we snap the last vertex to the first one
      // and then click without hitting the last marker. Click happens on the map
      // in 99% of cases it's because the user wants to finish the polygon. So...
      return;
    }

    this._layer._latlngInfo = this._layer._latlngInfo || [];
    this._layer._latlngInfo.push({
      latlng,
      snapInfo: this._hintMarker._snapInfo,
    });

    this._layer.addLatLng(latlng);
    const newMarker = this._createMarker(latlng);
    this._setTooltipText();

    this._setHintLineAfterNewVertex(latlng);

    if (this.options.closedPolygonEdge) {
      this._setCloseLineAfterNewVertex(latlng);
    }

    this._fireVertexAdded(newMarker, undefined, latlng, 'Draw');
    this._change(this._layer.getLatLngs());
    // check if we should finish on snap
    if (this.options.finishOn === 'snap' && this._hintMarker._snapped) {
      this._finishShape(e);
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
    const markers = this._markers;

    // if all markers are gone, cancel drawing
    if (markers.length <= 1) {
      this.disable();
      return;
    }

    // remove last coords
    let coords = this._layer.getLatLngs();

    const removedMarker = markers[markers.length - 1];

    // the index path to the marker inside the multidimensional marker array
    const { indexPath } = L.PM.Utils.findDeepMarkerIndex(
      markers,
      removedMarker
    );

    // remove last marker from array
    markers.pop();

    // remove that marker
    this._layerGroup.removeLayer(removedMarker);

    const markerPrevious = markers[markers.length - 1];

    // no need for findDeepMarkerIndex because the coords are always flat (Polyline) no matter if Line or Polygon
    const indexMarkerPrev = coords.indexOf(markerPrevious.getLatLng());

    // +1 don't cut out the previous marker
    coords = coords.slice(0, indexMarkerPrev + 1);

    // update layer with new coords
    this._layer.setLatLngs(coords);
    this._layer._latlngInfo.pop();

    // sync the hintline again
    this._syncHintLine();
    // sync the closeline again
    if (this.options.closedPolygonEdge) {
      this._syncCloseLine();
    }
    this._setTooltipText();

    this._fireVertexRemoved(removedMarker, indexPath, 'Draw');
    this._change(this._layer.getLatLngs());
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
