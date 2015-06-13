/*global _, d3, google*/
/*jshint camelcase: false */
google.maps.Map.prototype.boundsAt = function (zoom, center, proj, div) {
  var p = proj || this.getProjection();
  if (!p) {
    return undefined;
  }
  //var d = $(div || this.getDiv());
  var d = div || this.getDiv();
  var zf = Math.pow(2, zoom) * 2;
  var dw = d.clientWidth  / zf;
  var dh = d.clientHeight / zf;
  var cpx = p.fromLatLngToPoint(center || this.getCenter());
  var llb = new google.maps.LatLngBounds(
      p.fromPointToLatLng(new google.maps.Point(cpx.x - dw, cpx.y + dh)),
      p.fromPointToLatLng(new google.maps.Point(cpx.x + dw, cpx.y - dh)));
  return {
    'from_long': llb.qa.j,
    'to_long': llb.qa.A,
    'from_lat': llb.za.A,
    'to_lat': llb.za.j
  };
};

// Create the Google Map…
var map = new google.maps.Map( d3.select('#map').node(), {
  zoom: 14,
  minZoom: 14,
  maxZoom: 21,
  center: new google.maps.LatLng( 50.075538, 14.437800 ),
  mapTypeId: google.maps.MapTypeId.ROADMAP
});

var buildQuery = function ( bounds, table, limit ) {
  var url = 'http://ubuntu-bte.cloudapp.net/rest/v1/db.php?table=';
  url += table;
  if ( limit ) {
    url += '&limit=' + limit;
  }
  if ( bounds ) {
    Object.keys( bounds ).forEach( function ( key ) {
      url += '&' + key + '=' + bounds[key];
    } );
  }
  return url;
};

var padding = 100;

// Load the station data. When the data comes back, create an overlay.
var PointLayer = function( initData, options ) {
  var _data = initData;
  var _layer = null;
  var _projection = null;
  var _dataKey = options.dataKey || 'id';
  options = options || {};
  options.radius = options.radius || 10;

  var transform = function ( d ) {
    d = new google.maps.LatLng( d.lat, d.lon );
    d = _projection.fromLatLngToDivPixel( d );
    return d3.select( this )
      .style('left', ( d.x - padding ) + 'px')
      .style('top', ( d.y - padding ) + 'px');
  };

  var transformWithEase = function ( d ) {
    d = new google.maps.LatLng( d.lat, d.lon );
    d = _projection.fromLatLngToDivPixel( d );
    return d3.select( this )
      .transition().duration(300)
      .style('left', ( d.x - padding ) + 'px')
      .style('top', ( d.y - padding ) + 'px');
  };

  // Add the container when the overlay is added to the map.
  this.onAdd = function() {
    _layer = d3.select( this.getPanes().overlayLayer ).append('div')
    .attr('class', 'stations');
  };

  // Draw each marker as a separate SVG element.
  // We could use a single SVG, but what size would it have?
  this.draw = function() {
    _projection = this.getProjection();

    var marker = _layer.selectAll('svg')
      .data( _data, function ( d ) {
        return d[_dataKey];
      } )
      .each( transform ) // update existing markers
      .enter().append('svg:svg')
      .each( transform )
      .attr('class', 'marker');

    var circle = marker.append('svg:circle')
      .attr('r', options.radius )
      .attr('cx', padding )
      .attr('cy', padding );

    if ( options.color ) {
      circle.style('fill', options.color );
    }

    if ( options.image ) {
      var size = 3.5 * options.radius;
      marker.append('svg:image')
        .attr( 'xlink:href', options.image )
        .attr( 'x', padding - 0.5 * size )
        .attr( 'y', padding - 0.5 * size)
        .attr( 'width', size )
        .attr( 'height', size );
    }

    // Add a label.
    if ( options.label ) {
      marker.append('svg:text')
        .classed( 'label', true )
        .attr('x', padding + 7 )
        .attr('y', padding )
        .attr('dy', '.31em')
        .text( function( d ) { return d[options.label]; } );
    }

    _layer.selectAll( 'text.label' ).transition()
      .duration( 500 );
  };

  this.onRemove = function () {
    _layer.remove();
  };

  this.update = function ( data ) {
    //update internal data which drive redrawing on zoom_changed
    for (var i = 0; i < data.length; i++) {
      var found = false;
      for (var j = 0; j < _data.length; j++) {
        if (_data[j][_dataKey] === data[i][_dataKey]) {
          found = true;
          _data[j].lat = data[i].lat;
          _data[j].lon = data[i].lon;
        }
      }
      if ( !found ) {
        _data.push(data[i]);
      }
    }
    this.draw();
    _layer.selectAll("svg")
      .data(_data, function (d) { return d[_dataKey]; })
      .each(transformWithEase);
  };
};

PointLayer.prototype = new google.maps.OverlayView();

var RoutesLayer = function( initData ) {
  var _data = initData;
  var _layer = null;
  var _projection = null;
  var _dataKeyFn = function ( d ) {
    return d.lat + d.lon;
  };

  var transform = function ( d ) {
    d = new google.maps.LatLng( d.lat, d.lon );
    d = _projection.fromLatLngToDivPixel( d );
    return d3.select( this )
      .style('left', ( d.x - padding ) + 'px')
      .style('top', ( d.y - padding ) + 'px');
  };

  var transformWithEase = function ( d ) {
    d = new google.maps.LatLng( d.lat, d.lon );
    d = _projection.fromLatLngToDivPixel( d );
    return d3.select( this )
      .transition().duration(300)
      .style('left', ( d.x - padding ) + 'px')
      .style('top', ( d.y - padding ) + 'px');
  };

  // Add the container when the overlay is added to the map.
  this.onAdd = function() {
    _layer = d3.select( this.getPanes().overlayLayer ).append('div')
    .attr('class', 'stations');
  };

  // Draw each marker as a separate SVG element.
  // We could use a single SVG, but what size would it have?
  this.draw = function() {
    _projection = this.getProjection();

    var marker = _layer.selectAll('svg')
      .data( _data, _dataKeyFn )
      .each( transform ) // update existing markers
      .enter().append('svg:svg')
      .each( transform )
      .attr('class', 'dot');

    marker.append('svg:circle')
      .attr('r', 5 )
      .attr('cx', padding )
      .attr('cy', padding )
      .style('fill', '#000000' );

    _layer.selectAll( 'text.label' ).transition()
      .duration( 500 );
  };

  this.onRemove = function () {
    _layer.remove();
  };

  this.update = function ( data ) {
    //update internal data which drive redrawing on zoom_changed
    for (var i = 0; i < data.length; i++) {
      var found = false;
      for (var j = 0; j < _data.length; j++) {
        if ( _dataKeyFn( _data[j] ) === _dataKeyFn( data[i] ) ) {
          found = true;
          _data[j].lat = data[i].lat;
          _data[j].lon = data[i].lon;
        }
      }
      if ( !found ) {
        _data.push(data[i]);
      }
    }
    this.draw();
    _layer.selectAll("svg")
      .data(_data, _dataKeyFn )
      .each(transformWithEase);
  };
};

RoutesLayer.prototype = new google.maps.OverlayView();

// Create layers and add to map
var stopsLayer= new PointLayer( [], {
  color: '#004fe1',
  dataKey: 'stopName',
  label: 'stopName'
} );
stopsLayer.setMap( map );

var routesLayer= new RoutesLayer( [] );
routesLayer.setMap( map );

var vehiclesLayer= new PointLayer( [], {
  color: '#00ff00',
  dataKey: 'vehicleId',
  image: function ( d ) {
    if ( d.vehicleType === 0 ) {
      return 'assets/tram.png';
    } else if ( d.vehicleType === 1 ) {
      return 'assets/subway.png';
    } else if ( d.vehicleType === 3 ) {
      return 'assets/bus.png';
    }
    return null;
  },
  radius: 17
} );
vehiclesLayer.setMap( map );

var locationLayer= new PointLayer( [], {
  color: '#ff0000'
} );
locationLayer.setMap( map );

// Listen for map changes
var bounds = null;
google.maps.event.addListener( map, 'idle', function() {
  bounds = this.boundsAt( this.zoom );
  var query = buildQuery( bounds, 'pid_stops', 500 );
  d3.json( query, function ( data ) {
    stopsLayer.update( data );
  } );

  if ( this.zoom > 18 ) {
    query = buildQuery( bounds, 'pid_routes' );
    d3.json( query, function ( data ) {
      // For now concat all the data, just showing points
      var allPoints = _.reduce( _.values( data ), function (total, n ) { return total.concat( n ); } );
      routesLayer.update( allPoints );
    } );
  }

  query = buildQuery( bounds, 'pid_vehicles', 2500 );
  d3.json( query, function ( data ) {
    vehiclesLayer.update( data );
  } );
});

var liveUpdate = function () {
  var query = buildQuery( bounds, 'pid_vehicles', 2500 );
  d3.json( query, function ( data ) {
    vehiclesLayer.update( data );
  } );
};
setInterval( liveUpdate, 5000 );

// Only center location a few times
var locCount = 5;
// Listen for location updates
var onLocationUpdate = function ( geolocation ) {
  var latlon = {
    lat: geolocation.coords.latitude,
    lon: geolocation.coords.longitude
  };

  if ( locCount > 0 ) {
    var ll = new google.maps.LatLng(latlon.lat, latlon.lon);
    map.panTo( ll );
    map.setZoom( 18 );
    locCount--;
  }

  locationLayer.update( [latlon] );
};

navigator.geolocation.watchPosition( onLocationUpdate, console.log, {enableHighAccuracy: true} );
