var scene = null;
var camera = null;
var renderer = null;
var projector = null;
var directionalLight = null;
var activeAction = null;
var planet = null;
var tileSelection = null;
var zoom = 1.0;
var zoomAnimationStartTime = null;
var zoomAnimationDuration = null;
var zoomAnimationStartValue = null;
var zoomAnimationEndValue = null;
var cameraLatitude = 0;
var cameraLongitude = 0;
var projectionRenderMode = "globe";
var surfaceRenderMode = "terrain";
var renderSunlight = true;
var renderPlateBoundaries = false;
var renderPlateMovements = false;
var renderAirCurrents = false;
var sunTimeOffset = 0;
var pressedKeys = {};
var disableKeys = false;
var ui = {};

var generationSettings =
{
	subdivisions: 20,
	distortionLevel: 1,
	plateCount: 36,
	oceanicRate: 0.7,
	heatLevel: 1.0,
	moistureLevel: 1.0,
	seed: null,
};

var Vector3 = THREE.Vector3;

var KEY_ENTER = 13;
var KEY_SHIFT = 16;
var KEY_ESCAPE = 27;
var KEY_SPACE = 32;
var KEY_LEFTARROW = 37;
var KEY_UPARROW = 38;
var KEY_RIGHTARROW = 39;
var KEY_DOWNARROW = 40;
var KEY_PAGEUP = 33;
var KEY_PAGEDOWN = 34;
var KEY_NUMPAD_PLUS = 107;
var KEY_NUMPAD_MINUS = 109;
var KEY_FORWARD_SLASH = 191;

var KEY = {};
for (var k = 0; k < 10; ++k) KEY[ String.fromCharCode(k + 48) ] = k + 48;
for (var k = 0; k < 26; ++k) KEY[ String.fromCharCode(k + 65) ] = k + 65;

$(document).ready(function onDocumentReady()
{
	scene = new THREE.Scene();
	camera = new THREE.PerspectiveCamera(75, 1, 0.2, 2000);
	mapCamera = new THREE.OrthographicCamera(-1, 1, -1, 1, 1, 10);
	renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
	projector = new THREE.Projector();

	mapCamera.position.set(0, 0, 8);
	mapCamera.up.set(0, 1, 0);
	mapCamera.lookAt(new Vector3(0, 0, 0));
	mapCamera.updateProjectionMatrix();
	
	renderer.setFaceCulling(THREE.CullFaceFront, THREE.FrontFaceDirectionCW);

	var ambientLight = new THREE.AmbientLight(0xFFFFFF);
	scene.add(ambientLight);
	
	directionalLight = new THREE.DirectionalLight(0xFFFFFF);
	directionalLight.position.set(-3, 3, 7).normalize();
	scene.add(directionalLight);

	requestAnimationFrame(render);

	resetCamera();
	updateCamera();

	ui.body = $("body");
	ui.frame = $("#viewportFrame");
	ui.rendererElement = $(renderer.domElement);
	ui.frame.append(ui.rendererElement);
	ui.rendererElement.on("mousewheel", zoomHandler);
	ui.rendererElement.on("click", clickHandler);
	ui.body.on("keydown", keyDownHandler);
	ui.body.on("keyup", keyUpHandler);
	ui.body.focus();
	
	ui.helpPanel = $("#helpPanel");

	ui.controlPanel = $("#controlPanel");
	ui.projectionDisplayButtons =
	{
		globe: $("#projectGlobe"),
		equalAreaMap: $("#projectEqualAreaMap"),
		mercatorMap: $("#projectMercatorMap"),
	};
	
	ui.projectionDisplayButtons.globe.click(setProjectionRenderMode.bind(null, "globe"));
	ui.projectionDisplayButtons.equalAreaMap.click(setProjectionRenderMode.bind(null, "equalAreaMap"));
	ui.projectionDisplayButtons.mercatorMap.click(setProjectionRenderMode.bind(null, "mercatorMap"));

	ui.surfaceDisplayButtons =
	{
		terrain: $("#showTerrainButton"),
		plates: $("#showPlatesButton"),
		elevation: $("#showElevationButton"),
		temperature: $("#showTemperatureButton"),
		moisture: $("#showMoistureButton"),
	};
	
	ui.surfaceDisplayButtons.terrain.click(setSurfaceRenderMode.bind(null, "terrain"));
	ui.surfaceDisplayButtons.plates.click(setSurfaceRenderMode.bind(null, "plates"));
	ui.surfaceDisplayButtons.elevation.click(setSurfaceRenderMode.bind(null, "elevation"));
	ui.surfaceDisplayButtons.temperature.click(setSurfaceRenderMode.bind(null, "temperature"));
	ui.surfaceDisplayButtons.moisture.click(setSurfaceRenderMode.bind(null, "moisture"));

	ui.showSunlightButton = $("#showSunlightButton");
	ui.showPlateBoundariesButton = $("#showPlateBoundariesButton");
	ui.showPlateMovementsButton = $("#showPlateMovementsButton");
	ui.showAirCurrentsButton = $("#showAirCurrentsButton");

	ui.showSunlightButton.click(showHideSunlight);
	ui.showPlateBoundariesButton.click(showHidePlateBoundaries);
	ui.showPlateMovementsButton.click(showHidePlateMovements);
	ui.showAirCurrentsButton.click(showHideAirCurrents);
	
	ui.lowDetailButton = $("#lowDetailButton");
	ui.mediumDetailButton = $("#mediumDetailButton");
	ui.highDetailButton = $("#highDetailButton");
	ui.generatePlanetButton = $("#generatePlanetButton");
	ui.advancedSettingsButton = $("#advancedSettingsButton");
	
	ui.lowDetailButton.click(setSubdivisions.bind(null, 20));
	ui.mediumDetailButton.click(setSubdivisions.bind(null, 40));
	ui.highDetailButton.click(setSubdivisions.bind(null, 60));
	ui.generatePlanetButton.click(generatePlanetAsynchronous);
	ui.advancedSettingsButton.click(showAdvancedSettings);

	ui.dataPanel = $("#dataPanel");

	ui.progressPanel = $("#progressPanel");
	ui.progressActionLabel = $("#progressActionLabel");
	ui.progressBarFrame = $("#progressBarFrame");
	ui.progressBar = $("#progressBar");
	ui.progressBarLabel = $("#progressBarLabel");
	ui.progressCancelButton = $("#progressCancelButton");
	ui.progressCancelButton.click(cancelButtonHandler);
	ui.progressPanel.hide();

	ui.tileCountLabel = $("#tileCountLabel");
	ui.pentagonCountLabel = $("#pentagonCountLabel");
	ui.hexagonCountLabel = $("#hexagonCountLabel");
	ui.heptagonCountLabel = $("#heptagonCountLabel");
	ui.plateCountLabel = $("#plateCountLabel");
	ui.waterPercentageLabel = $("#waterPercentageLabel");
	ui.rawSeedLabel = $("#rawSeedLabel");
	ui.originalSeedLabel = $("#originalSeedLabel");

	ui.minAirCurrentSpeedLabel = $("#minAirCurrentSpeedLabel");
	ui.avgAirCurrentSpeedLabel = $("#avgAirCurrentSpeedLabel");
	ui.maxAirCurrentSpeedLabel = $("#maxAirCurrentSpeedLabel");

	ui.minElevationLabel = $("#minElevationLabel");
	ui.avgElevationLabel = $("#avgElevationLabel");
	ui.maxElevationLabel = $("#maxElevationLabel");

	ui.minTemperatureLabel = $("#minTemperatureLabel");
	ui.avgTemperatureLabel = $("#avgTemperatureLabel");
	ui.maxTemperatureLabel = $("#maxTemperatureLabel");

	ui.minMoistureLabel = $("#minMoistureLabel");
	ui.avgMoistureLabel = $("#avgMoistureLabel");
	ui.maxMoistureLabel = $("#maxMoistureLabel");

	ui.minPlateMovementSpeedLabel = $("#minPlateMovementSpeedLabel");
	ui.avgPlateMovementSpeedLabel = $("#avgPlateMovementSpeedLabel");
	ui.maxPlateMovementSpeedLabel = $("#maxPlateMovementSpeedLabel");

	ui.minTileAreaLabel = $("#minTileAreaLabel");
	ui.avgTileAreaLabel = $("#avgTileAreaLabel");
	ui.maxTileAreaLabel = $("#maxTileAreaLabel");

	ui.minPlateAreaLabel = $("#minPlateAreaLabel");
	ui.avgPlateAreaLabel = $("#avgPlateAreaLabel");
	ui.maxPlateAreaLabel = $("#maxPlateAreaLabel");

	ui.minPlateCircumferenceLabel = $("#minPlateCircumferenceLabel");
	ui.avgPlateCircumferenceLabel = $("#avgPlateCircumferenceLabel");
	ui.maxPlateCircumferenceLabel = $("#maxPlateCircumferenceLabel");

	ui.generationSettingsPanel = $("#generationSettingsPanel");
	
	ui.detailLevelLabel = $("#detailLevelLabel");
	ui.detailLevelRange = $("#detailLevelRange");
	ui.distortionLevelLabel = $("#distortionLevelLabel");
	ui.distortionLevelRange = $("#distortionLevelRange");
	ui.tectonicPlateCountLabel = $("#tectonicPlateCountLabel");
	ui.tectonicPlateCountRange = $("#tectonicPlateCountRange");
	ui.oceanicRateLabel = $("#oceanicRateLabel");
	ui.oceanicRateRange = $("#oceanicRateRange");
	ui.heatLevelLabel = $("#heatLevelLabel");
	ui.heatLevelRange = $("#heatLevelRange");
	ui.moistureLevelLabel = $("#moistureLevelLabel");
	ui.moistureLevelRange = $("#moistureLevelRange");
	ui.seedTextBox = $("#seedTextBox");
	ui.advancedGeneratePlanetButton = $("#advancedGeneratePlanetButton");
	ui.advancedCancelButton = $("#advancedCancelButton");
	
	ui.detailLevelRange.on("input", function() { setSubdivisions(parseInt(ui.detailLevelRange.val())); });
	ui.distortionLevelRange.on("input", function() { setDistortionLevel(parseInt(ui.distortionLevelRange.val()) / 100); });
	ui.tectonicPlateCountRange.on("input", function() { setPlateCount(Math.floor(Math.pow(2, parseInt(ui.tectonicPlateCountRange.val()) / 300 * (Math.log(1000) / Math.log(2) - 1) + 1))); });
	ui.oceanicRateRange.on("input", function() { setOceanicRate(parseInt(ui.oceanicRateRange.val()) / 100); });
	ui.heatLevelRange.on("input", function() { setHeatLevel(parseInt(ui.heatLevelRange.val()) / 100 + 1); });
	ui.moistureLevelRange.on("input", function() { setMoistureLevel(parseInt(ui.moistureLevelRange.val()) / 100 + 1); });
	ui.seedTextBox.on("input", function() { setSeed(ui.seedTextBox.val()); });
	ui.advancedGeneratePlanetButton.click(function() { hideAdvancedSettings(); generatePlanetAsynchronous(); });
	ui.advancedCancelButton.click(hideAdvancedSettings);
	
	$("button").on("click", function(b) { $(this).blur(); });
	$("button").on("focus", function() { disableKeys = true; });
	$("input").on("focus", function() { disableKeys = true; });
	$("button").on("blur", function() { disableKeys = false; });
	$("input").on("blur", function() { disableKeys = false; });
	
	hideAdvancedSettings();
	setPlateCount(50);

	setProjectionRenderMode(projectionRenderMode, true);
	setSurfaceRenderMode(surfaceRenderMode, true);
	showHideSunlight(renderSunlight);
	showHidePlateBoundaries(renderPlateBoundaries);
	showHidePlateMovements(renderPlateMovements);
	showHideAirCurrents(renderAirCurrents);

	ui.lowDetailButton.click();

	//saveToFileSystem(serializePlanetMesh(planet.mesh, "function getPregeneratedPlanetMesh() { return ", "; }\n"));

	window.addEventListener("resize", resizeHandler);
	resizeHandler();
	
	ui.generatePlanetButton.click();
});

function setSubdivisions(subdivisions)
{
	if (typeof(subdivisions) === "number" && subdivisions >= 4)
	{
		generationSettings.subdivisions = subdivisions;
		$("#detailDisplaylist>button.toggled").removeClass("toggled");
		if (subdivisions === 20) ui.lowDetailButton.addClass("toggled");
		else if (subdivisions === 40) ui.mediumDetailButton.addClass("toggled");
		else if (subdivisions === 60) ui.highDetailButton.addClass("toggled");
		
		subdivisions = subdivisions.toFixed(0);
		if (ui.detailLevelRange.val() !== subdivisions) ui.detailLevelRange.val(subdivisions);
		ui.detailLevelLabel.text("Detail Level (" + subdivisions + ")");
	}
}

function setDistortionLevel(distortionLevel)
{
	if (typeof(distortionLevel) === "number" && distortionLevel >= 0 && distortionLevel <= 1)
	{
		generationSettings.distortionLevel = distortionLevel;
		
		distortionLevel = Math.floor(distortionLevel * 100 + 0.5).toFixed(0);
		
		if (ui.distortionLevelRange.val() !== distortionLevel) ui.distortionLevelRange.val(distortionLevel);
		ui.distortionLevelLabel.text("Distortion Level (" + distortionLevel + "%)");
	}
}

function setPlateCount(plateCount)
{
	if (typeof(plateCount) === "number" && plateCount >= 0)
	{
		generationSettings.plateCount = plateCount;
		
		var sliderVal = Math.ceil((Math.log(plateCount) / Math.log(2) - 1) / (Math.log(1000) / Math.log(2) - 1) * 300).toFixed(0);
		if (ui.tectonicPlateCountRange.val() !== sliderVal) ui.tectonicPlateCountRange.val(sliderVal);
		ui.tectonicPlateCountLabel.text(plateCount.toFixed(0));
	}
}

function setOceanicRate(oceanicRate)
{
	if (typeof(oceanicRate) === "number" && oceanicRate >= 0 && oceanicRate <= 1)
	{
		generationSettings.oceanicRate = oceanicRate;
		
		oceanicRate = Math.floor(oceanicRate * 100 + 0.5).toFixed(0);
		
		if (ui.oceanicRateRange.val() !== oceanicRate) ui.oceanicRateRange.val(oceanicRate);
		ui.oceanicRateLabel.text(oceanicRate);
	}
}

function setHeatLevel(heatLevel)
{
	if (typeof(heatLevel) === "number" && heatLevel >= 0)
	{
		generationSettings.heatLevel = heatLevel;
		
		heatLevel = Math.floor(heatLevel * 100 - 100).toFixed(0);
		
		if (ui.heatLevelRange.val() !== heatLevel) ui.heatLevelRange.val(heatLevel);
		if (generationSettings.heatLevel > 1) heatLevel = "+" + heatLevel;
		else if (generationSettings.heatLevel < 1) heatLevel = "-" + heatLevel;
		ui.heatLevelLabel.text(heatLevel);
	}
}

function setMoistureLevel(moistureLevel)
{
	if (typeof(moistureLevel) === "number" && moistureLevel >= 0)
	{
		generationSettings.moistureLevel = moistureLevel;
		
		moistureLevel = Math.floor(moistureLevel * 100 - 100).toFixed(0);
		
		if (ui.moistureLevelRange.val() !== moistureLevel) ui.moistureLevelRange.val(moistureLevel);
		if (generationSettings.moistureLevel > 1) moistureLevel = "+" + moistureLevel;
		else if (generationSettings.moistureLevel < 1) moistureLevel = "-" + moistureLevel;
		ui.moistureLevelLabel.text(moistureLevel);
	}
}

function setSeed(seed)
{
	if (!seed) generationSettings.seed = null;
	if (typeof(seed) === "number")
	{
		generationSettings.seed = Math.floor(seed);
		ui.seedTextBox.val(generationSettings.seed.toFixed(0));
	}
	else if (typeof(seed) === "string")
	{
		var asInt = parseInt(seed);
		if (isNaN(asInt) || asInt.toFixed(0) !== seed)
		{
			generationSettings.seed = seed;
		}
		else
		{
			generationSettings.seed = asInt;
			ui.seedTextBox.val(generationSettings.seed.toFixed(0));
		}
	}
	else
	{
		generationSettings.seed = null;
		ui.seedTextBox.val("");
	}
}

function generatePlanetAsynchronous()
{
	var planet;
	
	var subdivisions = generationSettings.subdivisions;

	var distortionRate;
	if (generationSettings.distortionLevel < 0.25) distortionRate = adjustRange(generationSettings.distortionLevel, 0.00, 0.25, 0.000, 0.040);
	else if (generationSettings.distortionLevel < 0.50) distortionRate = adjustRange(generationSettings.distortionLevel, 0.25, 0.50, 0.040, 0.050);
	else if (generationSettings.distortionLevel < 0.75) distortionRate = adjustRange(generationSettings.distortionLevel, 0.50, 0.75, 0.050, 0.075);
	else distortionRate = adjustRange(generationSettings.distortionLevel, 0.75, 1.00, 0.075, 0.150);

	var originalSeed = generationSettings.seed;
	var seed;
	if (typeof(originalSeed) === "number") seed = originalSeed;
	else if (typeof(originalSeed) === "string") seed = hashString(originalSeed);
	else seed = Date.now();
	var random = new XorShift128(seed);
	
	var plateCount = generationSettings.plateCount;
	var oceanicRate = generationSettings.oceanicRate;
	var heatLevel = generationSettings.heatLevel;
	var moistureLevel = generationSettings.moistureLevel;
	
	activeAction = new SteppedAction(updateProgressUI)
		.executeSubaction(function(action) { ui.progressPanel.show(); }, 0)
		.executeSubaction(function(action) { generatePlanet(subdivisions, distortionRate, plateCount, oceanicRate, heatLevel, moistureLevel, random, action); }, 1, "Generating Planet")
		.getResult(function(result) { planet = result; planet.seed = seed; planet.originalSeed = originalSeed; })
		.executeSubaction(function(action) { displayPlanet(planet); setSeed(null); }, 0)
		.finalize(function(action) { activeAction = null; ui.progressPanel.hide(); }, 0)
		.execute();
}

function showAdvancedSettings()
{
	ui.generationSettingsPanel.show();
}

function hideAdvancedSettings()
{
	ui.generationSettingsPanel.hide();
}

function Planet()
{
}

var lastRenderFrameTime = null;

function getZoomDelta()
{
	var zoomIn = (pressedKeys[KEY_NUMPAD_PLUS] || pressedKeys[KEY_PAGEUP]);
	var zoomOut = (pressedKeys[KEY_NUMPAD_MINUS] || pressedKeys[KEY_PAGEDOWN]);
	if (zoomIn && !zoomOut) return -1;
	if (zoomOut && !zoomIn) return +1;
	return 0;
}

function getLatitudeDelta()
{
	var up = (pressedKeys[KEY.W] || pressedKeys[KEY.Z] || pressedKeys[KEY_UPARROW]);
	var down = (pressedKeys[KEY.S] || pressedKeys[KEY_DOWNARROW]);
	if (up && !down) return +1;
	if (down && !up) return -1;
	return 0;
}

function getLongitudeDelta()
{
	var left = (pressedKeys[KEY.A] || pressedKeys[KEY.Q] || pressedKeys[KEY_LEFTARROW]);
	var right = (pressedKeys[KEY.D] || pressedKeys[KEY_RIGHTARROW]);
	if (right && !left) return +1;
	if (left && !right) return -1;
	return 0;
}

function render()
{
	var currentRenderFrameTime = Date.now();
	var frameDuration = lastRenderFrameTime !== null ? Math.min((currentRenderFrameTime - lastRenderFrameTime) * 0.001, 0.1) : 0;
	
	var cameraNeedsUpdated = false;
	if (zoomAnimationStartTime !== null)
	{
		if (zoomAnimationStartTime + zoomAnimationDuration <= currentRenderFrameTime)
		{
			zoom = zoomAnimationEndValue;
			zoomAnimationStartTime = null;
			zoomAnimationDuration = null;
			zoomAnimationStartValue = null;
			zoomAnimationEndValue = null;
		}
		else
		{
			zoomAnimationProgress = (currentRenderFrameTime - zoomAnimationStartTime) / zoomAnimationDuration;
			zoom = (zoomAnimationEndValue - zoomAnimationStartValue) * zoomAnimationProgress + zoomAnimationStartValue;
		}
		cameraNeedsUpdated = true;
	}

	var cameraZoomDelta = getZoomDelta();
	if (frameDuration > 0 && cameraZoomDelta !== 0)
	{
		zoom = Math.max(0, Math.min(zoom + frameDuration * cameraZoomDelta * 0.5, 1));
		cameraNeedsUpdated = true;
	}
	
	var cameraLatitudeDelta = getLatitudeDelta();
	if (frameDuration > 0 && cameraLatitudeDelta !== 0)
	{
		cameraLatitude += frameDuration * -cameraLatitudeDelta * Math.PI * (zoom * 0.5 + (1 - zoom) * 1 / 20);
		cameraLatitude = Math.max(-Math.PI * 0.49, Math.min(cameraLatitude, Math.PI * 0.49));
		cameraNeedsUpdated = true;
	}
	
	var cameraLongitudeDelta = getLongitudeDelta();
	if (frameDuration > 0 && cameraLongitudeDelta !== 0)
	{
		cameraLongitude += frameDuration * cameraLongitudeDelta * Math.PI * (zoom * Math.PI / 8 + (1 - zoom) / (20 * Math.max(Math.cos(cameraLatitude), 0.1)));
		cameraLongitude = cameraLongitude - Math.floor(cameraLongitude / (Math.PI * 2)) * Math.PI * 2;
		cameraNeedsUpdated = true;
	}

	if (cameraNeedsUpdated) updateCamera();
	
	var sunTime = Math.PI * 2 * currentRenderFrameTime / 60000 + sunTimeOffset;
	directionalLight.position.set(Math.cos(sunTime), 0, Math.sin(sunTime)).normalize();

	requestAnimationFrame(render);
	if (projectionRenderMode === "globe")
	{
		renderer.render(scene, camera);
	}
	else
	{
		renderer.render(scene, mapCamera);
	}
	
	lastRenderFrameTime = currentRenderFrameTime;
}

var mapProjections =
{
	equalAreaMap: function equalAreaMap(longitude, latitude, z)
	{
		return new Vector3(longitude / Math.PI, Math.sin(latitude), z);
	},
	mercatorMap: function mercatorMap(longitude, latitude, z)
	{
		return new Vector3(longitude / Math.PI, Math.log(Math.tan(Math.PI / 4 + Math.max(-1.5, Math.min(latitude * 0.4, 1.5)))) / 1.75, z);
	},
};

var mapProjectionsInverse =
{
	equalAreaMap: function equalAreaMap(x, y)
	{
		return { longitude: x * Math.PI, latitude: Math.asin(y) };
	},
	mercatorMap: function mercatorMap(x, y)
	{
		return { longitude: x * Math.PI, latitude: (Math.atan(Math.exp(y * 1.75)) - Math.PI / 4) * 2.5 };
	},
};

function renderMap()
{
	var project = mapProjections[projectionRenderMode];
	if (project)
	{
		var surfaceColorArrayKeys = [ "terrainColors", "plateColors", "elevationColors", "temperatureColors", "moistureColors" ];
		projectMap(planet.renderData.surface, surfaceColorArrayKeys, project);
		projectMap(planet.renderData.plateBoundaries, null, project);
		projectMap(planet.renderData.plateMovements, null, project);
		projectMap(planet.renderData.airCurrents, null, project);

		scene.add(planet.renderData.surface.mapRenderObject);
		setSurfaceRenderMode(surfaceRenderMode, true);
		showHideSunlight(renderSunlight);
		showHidePlateBoundaries(renderPlateBoundaries);
		showHidePlateMovements(renderPlateMovements);
		showHideAirCurrents(renderAirCurrents);
		
		if (tileSelection !== null)
		{
			tileSelection.mapMaterial = tileSelection.material.clone();
			projectMap(tileSelection, null, project);
			planet.renderData.surface.mapRenderObject.add(tileSelection.mapRenderObject);
		}
	}
}

function resizeHandler()
{
	updateCamera();
	renderer.setSize(window.innerWidth, window.innerHeight);
}

function resetCamera()
{
	zoom = 1.0;
	zoomAnimationStartTime = null;
	zoomAnimationDuration = null;
	zoomAnimationStartValue = null;
	zoomAnimationEndValue = null;
	cameraLatitude = 0;
	cameraLongitude = 0;
}

function updateCamera()
{
	camera.aspect = window.innerWidth / window.innerHeight;
	
	var transformation = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(cameraLatitude, cameraLongitude, 0, "YXZ"));
	camera.position.set(0, -50, 1050);
	camera.position.lerp(new Vector3(0, 0, 2000), Math.pow(zoom, 2.0));
	camera.position.applyMatrix4(transformation);
	camera.up.set(0, 1, 0);
	camera.up.applyMatrix4(transformation);
	camera.lookAt(new Vector3(0, 0, 1000).applyMatrix4(transformation));
	camera.updateProjectionMatrix();

	if (projectionRenderMode !== "globe")
	{
		renderMap();
	}
}

function zoomHandler(event)
{
	if (zoomAnimationStartTime === null)
	{
		zoomAnimationStartTime = Date.now();
		zoomAnimationStartValue = zoom;
		zoomAnimationEndValue = Math.max(0, Math.min(zoomAnimationStartValue - event.deltaY * 0.04, 1));
		zoomAnimationDuration = Math.abs(zoomAnimationStartValue - zoomAnimationEndValue) * 1000;
	}
	else
	{
		zoomAnimationStartTime = Date.now();
		zoomAnimationStartValue = zoom;
		zoomAnimationEndValue = Math.max(0, Math.min(zoomAnimationEndValue - event.deltaY * 0.04, 1));
		zoomAnimationDuration = Math.abs(zoomAnimationStartValue - zoomAnimationEndValue) * 1000;
	}
}

function selectTile(tile)
{
	if (tileSelection !== null)
	{
		if (tileSelection.tile === tile) return;
		deselectTile();
	}
	
	console.log(tile);
	
	var outerColor = new THREE.Color(0x000000);
	var innerColor = new THREE.Color(0xFFFFFF);
	
	var geometry = new THREE.Geometry();
	
	geometry.vertices.push(tile.averagePosition);
	for (var i = 0; i < tile.corners.length; ++i)
	{
		geometry.vertices.push(tile.corners[i].position);
		geometry.faces.push(new THREE.Face3(i + 1, (i + 1) % tile.corners.length + 1, 0, tile.normal, [ outerColor, outerColor, innerColor ]));
	}

	geometry.boundingSphere = tile.boundingSphere.clone();

	var material = new THREE.MeshLambertMaterial({ vertexColors: THREE.VertexColors, });
	material.transparent = true;
	material.opacity = 0.5;
	material.polygonOffset = true;
	material.polygonOffsetFactor = -2;
	material.polygonOffsetUnits = -2;
	tileSelection = { tile: tile, geometry: geometry, material: material, renderObject: new THREE.Mesh(geometry, material) };
	planet.renderData.surface.renderObject.add(tileSelection.renderObject);
	
	if (projectionRenderMode !== "globe")
	{
		project = mapProjections[projectionRenderMode];
		if (project)
		{
			tileSelection.mapMaterial = material.clone();
			projectMap(tileSelection, null, project);
			planet.renderData.surface.mapRenderObject.add(tileSelection.mapRenderObject);
		}
	}
}

function deselectTile()
{
	if (tileSelection !== null)
	{
		planet.renderData.surface.renderObject.remove(tileSelection.renderObject);
		if (tileSelection.mapRenderObject)
		{
			planet.renderData.surface.mapRenderObject.remove(tileSelection.mapRenderObject);
		}
		tileSelection = null;
	}
}

function clickHandler(event)
{
	if (planet)
	{
		var x = event.pageX / renderer.domElement.width * 2 - 1;
		var y = 1 - event.pageY / renderer.domElement.height * 2;
		var ray;
		if (projectionRenderMode === "globe")
		{
			var rayCaster = projector.pickingRay(new Vector3(x, y, 0), camera);
			ray = rayCaster.ray;
		}
		else
		{
			var projectInverse = mapProjectionsInverse[projectionRenderMode];
			if (!projectInverse) return;
			
			var pos = projectInverse(x, y);
			var origin = new Vector3(
				Math.sin(pos.longitude) * 2000 * Math.cos(pos.latitude),
				Math.sin(pos.latitude) * 2000,
				Math.cos(pos.longitude) * 2000 * Math.cos(pos.latitude));
			var transformation = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(cameraLatitude, cameraLongitude, 0, "ZYX"));
			origin.applyMatrix4(transformation);
			ray = new THREE.Ray(origin, origin.clone().negate().normalize());
		}
		var intersection = planet.partition.intersectRay(ray);
		if (intersection !== false)
			selectTile(intersection);
		else
			deselectTile();
	}
}

function keyDownHandler(event)
{
	if (disableKeys === true ) return;
	if (event.ctrlKey || event.altKey || event.shiftKey || event.metaKey) return;
	
	switch (event.which)
	{
		case KEY.W:
		case KEY.A:
		case KEY.S:
		case KEY.D:
		case KEY.Z:
		case KEY.Q:
		case KEY_LEFTARROW:
		case KEY_RIGHTARROW:
		case KEY_UPARROW:
		case KEY_DOWNARROW:
		case KEY_PAGEUP:
		case KEY_PAGEDOWN:
		case KEY_NUMPAD_PLUS:
		case KEY_NUMPAD_MINUS:
			pressedKeys[event.which] = true;
			event.preventDefault();
			break;
	}
}

function keyUpHandler(event)
{
	if (disableKeys === true ) return;
	if (event.ctrlKey || event.altKey || event.shiftKey || event.metaKey) return;

	switch (event.which)
	{
		case KEY.W:
		case KEY.A:
		case KEY.S:
		case KEY.D:
		case KEY.Z:
		case KEY.Q:
		case KEY_LEFTARROW:
		case KEY_RIGHTARROW:
		case KEY_UPARROW:
		case KEY_DOWNARROW:
		case KEY_PAGEUP:
		case KEY_PAGEDOWN:
		case KEY_NUMPAD_PLUS:
		case KEY_NUMPAD_MINUS:
			pressedKeys[event.which] = false;
			event.preventDefault();
			break;
		case KEY_ESCAPE:
			if (activeAction !== null)
			{
				ui.progressCancelButton.click();
				event.preventDefault();
			}
			break;
		case KEY_FORWARD_SLASH:
		case KEY["0"]:
			showHideInterface();
			event.preventDefault();
			break;
		case KEY_SPACE:
			generatePlanetAsynchronous();
			event.preventDefault();
			break;
		case KEY["1"]:
			setSubdivisions(20);
			generatePlanetAsynchronous();
			event.preventDefault();
			break;
		case KEY["2"]:
			setSubdivisions(40);
			generatePlanetAsynchronous();
			event.preventDefault();
			break;
		case KEY["3"]:
			setSubdivisions(60);
			generatePlanetAsynchronous();
			event.preventDefault();
			break;
		case KEY["5"]:
			setSurfaceRenderMode("terrain");
			event.preventDefault();
			break;
		case KEY["6"]:
			setSurfaceRenderMode("plates");
			event.preventDefault();
			break;
		case KEY["7"]:
			setSurfaceRenderMode("elevation");
			event.preventDefault();
			break;
		case KEY["8"]:
			setSurfaceRenderMode("temperature");
			event.preventDefault();
			break;
		case KEY["9"]:
			setSurfaceRenderMode("moisture");
			event.preventDefault();
			break;
		case KEY.G:
			setProjectionRenderMode("globe");
			event.preventDefault();
			break;
		case KEY.H:
			setProjectionRenderMode("equalAreaMap");
			event.preventDefault();
			break;
		case KEY.J:
			setProjectionRenderMode("mercatorMap");
			event.preventDefault();
			break;
		case KEY.U:
			showHideSunlight();
			event.preventDefault();
			break;
		case KEY.I:
			showHidePlateBoundaries();
			event.preventDefault();
			break;
		case KEY.O:
			showHidePlateMovements();
			event.preventDefault();
			break;
		case KEY.P:
			showHideAirCurrents();
			event.preventDefault();
			break;
	}
}

function cancelButtonHandler()
{
	if (activeAction !== null)
	{
		activeAction.cancel();
	}
}

function displayPlanet(newPlanet)
{
	if (planet)
	{
		tileSelection = null;
		scene.remove(planet.renderData.surface.renderObject);
		scene.remove(planet.renderData.surface.mapRenderObject);
	}
	else
	{
		sunTimeOffset = Math.PI * 2 * (1/12 - Date.now() / 60000);
	}

	planet = newPlanet;
	scene.add(planet.renderData.surface.renderObject);
	
	setProjectionRenderMode(projectionRenderMode, true);
	setSurfaceRenderMode(surfaceRenderMode, true);
	showHideSunlight(renderSunlight);
	showHidePlateBoundaries(renderPlateBoundaries);
	showHidePlateMovements(renderPlateMovements);
	showHideAirCurrents(renderAirCurrents);

	updateCamera();
	updateUI();
	
	console.log("Original Seed", planet.originalSeed);
	console.log("Raw Seed", planet.seed);
	console.log("Statistics", planet.statistics);
}

function showHideInterface()
{
	ui.helpPanel.toggle();
	ui.controlPanel.toggle();
	ui.dataPanel.toggle();
}

function updateUI()
{
	ui.tileCountLabel.text(planet.statistics.tiles.count.toFixed(0));
	ui.pentagonCountLabel.text(planet.statistics.tiles.pentagonCount.toFixed(0));
	ui.hexagonCountLabel.text(planet.statistics.tiles.hexagonCount.toFixed(0));
	ui.heptagonCountLabel.text(planet.statistics.tiles.heptagonCount.toFixed(0));
	ui.plateCountLabel.text(planet.statistics.plates.count.toFixed(0));
	ui.waterPercentageLabel.text(((planet.statistics.tiles.biomeAreas["ocean"] + planet.statistics.tiles.biomeAreas["oceanGlacier"]) / planet.statistics.tiles.totalArea * 100).toFixed(0) + "%");

	ui.rawSeedLabel.val(planet.seed);
	ui.originalSeedLabel.val(planet.originalSeed !== null ? planet.originalSeed : "");

	ui.minAirCurrentSpeedLabel.text(planet.statistics.corners.airCurrent.min.toFixed(0));
	ui.avgAirCurrentSpeedLabel.text(planet.statistics.corners.airCurrent.avg.toFixed(0));
	ui.maxAirCurrentSpeedLabel.text(planet.statistics.corners.airCurrent.max.toFixed(0));

	ui.minElevationLabel.text((planet.statistics.tiles.elevation.min * 100).toFixed(0));
	ui.avgElevationLabel.text((planet.statistics.tiles.elevation.avg * 100).toFixed(0));
	ui.maxElevationLabel.text((planet.statistics.tiles.elevation.max * 100).toFixed(0));

	ui.minTemperatureLabel.text((planet.statistics.tiles.temperature.min * 100).toFixed(0));
	ui.avgTemperatureLabel.text((planet.statistics.tiles.temperature.avg * 100).toFixed(0));
	ui.maxTemperatureLabel.text((planet.statistics.tiles.temperature.max * 100).toFixed(0));

	ui.minMoistureLabel.text((planet.statistics.tiles.moisture.min * 100).toFixed(0));
	ui.avgMoistureLabel.text((planet.statistics.tiles.moisture.avg * 100).toFixed(0));
	ui.maxMoistureLabel.text((planet.statistics.tiles.moisture.max * 100).toFixed(0));

	ui.minPlateMovementSpeedLabel.text(planet.statistics.tiles.plateMovement.min.toFixed(0));
	ui.avgPlateMovementSpeedLabel.text(planet.statistics.tiles.plateMovement.avg.toFixed(0));
	ui.maxPlateMovementSpeedLabel.text(planet.statistics.tiles.plateMovement.max.toFixed(0));

	ui.minTileAreaLabel.text(planet.statistics.tiles.area.min.toFixed(0));
	ui.avgTileAreaLabel.text(planet.statistics.tiles.area.avg.toFixed(0));
	ui.maxTileAreaLabel.text(planet.statistics.tiles.area.max.toFixed(0));

	ui.minPlateAreaLabel.text((planet.statistics.plates.area.min / 1000).toFixed(0) + "K");
	ui.avgPlateAreaLabel.text((planet.statistics.plates.area.avg / 1000).toFixed(0) + "K");
	ui.maxPlateAreaLabel.text((planet.statistics.plates.area.max / 1000).toFixed(0) + "K");

	ui.minPlateCircumferenceLabel.text(planet.statistics.plates.circumference.min.toFixed(0));
	ui.avgPlateCircumferenceLabel.text(planet.statistics.plates.circumference.avg.toFixed(0));
	ui.maxPlateCircumferenceLabel.text(planet.statistics.plates.circumference.max.toFixed(0));
}

function updateProgressUI(action)
{
	var progress = action.getProgress();
	ui.progressBar.css("width", (progress * 100).toFixed(0) + "%");
	ui.progressBarLabel.text((progress * 100).toFixed(0) + "%");
	ui.progressActionLabel.text(action.getCurrentActionName());
}

function projectMap(renderData, globeColorArrayKeys, project)
{
	var mapGeometry = new THREE.Geometry();
	var globeGeometry = renderData.geometry;
	
	if (globeColorArrayKeys)
	{
		renderData.mapColorArrays = {};
		for (var i = 0; i < globeColorArrayKeys.length; ++i)
		{
			var globeColorArray = renderData[globeColorArrayKeys[i]];
			var mapColorArray = [];
			for (var j = 0; j < globeColorArray.length; ++j)
			{
				mapColorArray.push(globeColorArray[j].slice());
			}
			renderData.mapColorArrays[globeColorArrayKeys[i]] = mapColorArray;
		}
	}

	var transformation = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(-cameraLatitude, -cameraLongitude, 0, "XYZ"));
	
	for (var i = 0; i < globeGeometry.vertices.length; ++i)
	{
		var globePosition = globeGeometry.vertices[i].clone();
		globePosition.applyMatrix4(transformation);
		globePosition.multiplyScalar(0.001);
		var longitude = Math.atan2(globePosition.x, globePosition.z);
		var xSquared = globePosition.x * globePosition.x;
		var ySquared = globePosition.y * globePosition.y;
		var zSquared = globePosition.z * globePosition.z;
		var latitude = -Math.asin(globePosition.y);
		mapGeometry.vertices.push(project(longitude, latitude, Math.sqrt(xSquared + ySquared + zSquared) - 1));
	}
	
	if (globeColorArrayKeys)
	{
		for (var i = 0; i < globeGeometry.faces.length; ++i)
		{
			var globeFace = globeGeometry.faces[i];
			mapGeometry.faces.push(new THREE.Face3(globeFace.a, globeFace.b, globeFace.c, globeFace.normal));
		}
	}
	else
	{
		for (var i = 0; i < globeGeometry.faces.length; ++i)
		{
			var globeFace = globeGeometry.faces[i];
			mapGeometry.faces.push(new THREE.Face3(globeFace.a, globeFace.b, globeFace.c, globeFace.normal, globeFace.vertexColors));
		}
	}
	
	var checkForWrap = function checkForWrap(a, b)
	{
		if (a < -0.5 && b > 0.5) return 2;
		else if (b < -0.5 && a > 0.5) return -2;
		else return 0;
	};
	
	var mergeWrap = function checkForWrap(a, b)
	{
		if (a !== 0) return a;
		else if (b !== 0) return b;
		else return 0;
	};
	
	var addVertex = function addVertex(x, y, z, oldIndex)
	{
		var index = mapGeometry.vertices.length;
		mapGeometry.vertices.push(new Vector3(x, y, z));
		return index;
	};
	
	var addFace;
	if (globeColorArrayKeys)
	{
		addFace = function addFace(faceIndex, vertexIndex0, vertexIndex1, vertexIndex2)
		{
			mapGeometry.faces.push(new THREE.Face3(vertexIndex0, vertexIndex1, vertexIndex2, globeGeometry.faces[faceIndex].normal));
			for (var i = 0; i < globeColorArrayKeys.length; ++i)
			{
				var key = globeColorArrayKeys[i];
				renderData.mapColorArrays[key].push(renderData[globeColorArrayKeys[i]][faceIndex].slice());
			}
		};
	}
	else
	{
		addFace = function addFace(faceIndex, vertexIndex0, vertexIndex1, vertexIndex2)
		{
			mapGeometry.faces.push(new THREE.Face3(vertexIndex0, vertexIndex1, vertexIndex2, globeGeometry.faces[faceIndex].normal, globeGeometry.faces[faceIndex].vertexColors));
		};
	}
	
	var cornerWrap = function cornerWrap(wrap0, wrap1)
	{
		var delta = wrap0 - wrap1;
		var sum = wrap0 + wrap1;
		return delta * delta / sum;
	};
	
	for (var i = 0; i < globeGeometry.faces.length; ++i)
	{
		var face = mapGeometry.faces[i];
		var p0 = mapGeometry.vertices[face.a];
		var p1 = mapGeometry.vertices[face.b];
		var p2 = mapGeometry.vertices[face.c];
		
		var xWrap01 = checkForWrap(p0.x, p1.x);
		var yWrap01 = checkForWrap(p0.y, p1.y);
		var xWrap02 = checkForWrap(p0.x, p2.x);
		var yWrap02 = checkForWrap(p0.y, p2.y);
		var xWrap = mergeWrap(xWrap01, xWrap02);
		var yWrap = mergeWrap(yWrap01, yWrap02);
		
		if (xWrap !== 0)
		{
			if (yWrap !== 0)
			{
				var xWrap12 = xWrap02 - xWrap01;
				var yWrap12 = yWrap02 - yWrap01;
				
				addFace(i,
					addVertex(p0.x + xWrap01, p0.y + yWrap01, p0.z),
					face.b,
					addVertex(p2.x - xWrap12, p2.y - yWrap12, p2.z));
				
				addFace(i,
					addVertex(p0.x + xWrap02, p0.y + yWrap02, p0.z),
					addVertex(p1.x + xWrap12, p1.y + yWrap12, p1.z),
					face.c);
				
				addFace(i,
					addVertex(p0.x + cornerWrap(xWrap01, xWrap02), p0.y + cornerWrap(xWrap01, xWrap02), p0.z),
					addVertex(p1.x + cornerWrap(xWrap12, -xWrap01), p1.y + cornerWrap(xWrap12, -xWrap01), p1.z),
					addVertex(p2.x + cornerWrap(-xWrap02, -xWrap12), p2.y + cornerWrap(-xWrap02, -xWrap12), p2.z));
				
				face.b = addVertex(p1.x - xWrap01, p1.y - yWrap01, p1.z);
				face.c = addVertex(p2.x - xWrap02, p2.y - yWrap02, p2.z);
			}
			else
			{
				if (xWrap01 !== 0)
				{
					if (xWrap02 !== 0)
					{
						addFace(i,
							face.a,
							addVertex(p1.x - xWrap, p1.y, p1.z),
							addVertex(p2.x - xWrap, p2.y, p2.z));
						face.a = addVertex(p0.x + xWrap, p0.y, p0.z);
					}
					else
					{
						addFace(i,
							addVertex(p0.x + xWrap, p0.y, p0.z),
							face.b,
							addVertex(p2.x + xWrap, p2.y, p2.z));
						face.b = addVertex(p1.x - xWrap, p1.y, p1.z);
					}
				}
				else if (xWrap02 !== 0)
				{
					addFace(i,
						addVertex(p0.x + xWrap, p0.y, p0.z),
						addVertex(p1.x + xWrap, p1.y, p1.z),
						face.c);
					face.c = addVertex(p2.x - xWrap, p2.y, p2.z);
				}
			}
		}
		else if (yWrap !== 0)
		{
			if (yWrap01 !== 0)
			{
				if (yWrap02 !== 0)
				{
					addFace(i,
						face.a,
						addVertex(p1.x, p1.y - yWrap, p1.z),
						addVertex(p2.x, p2.y - yWrap, p2.z));
					face.a = addVertex(p0.x, p0.y + yWrap, p0.z);
				}
				else
				{
					addFace(i,
						addVertex(p0.x, p0.y + yWrap, p0.z),
						face.b,
						addVertex(p2.x, p2.y + yWrap, p2.z));
					face.b = addVertex(p1.x, p1.y - yWrap, p1.z);
				}
			}
			else if (yWrap02 !== 0)
			{
				addFace(i,
					addVertex(p0.x, p0.y + yWrap, p0.z),
					addVertex(p1.x, p1.y + yWrap, p1.z),
					face.c);
				face.c = addVertex(p2.x, p2.y - yWrap, p2.z);
			}
		}
	}
	
	if (renderData.mapRenderObject && renderData.mapRenderObject.parent) renderData.mapRenderObject.parent.remove(renderData.mapRenderObject);
	
	renderData.mapGeometry = mapGeometry;
	renderData.mapRenderObject = new THREE.Mesh(renderData.mapGeometry, renderData.mapMaterial);
}

function setProjectionRenderMode(mode, force)
{
	if (mode !== projectionRenderMode || force === true)
	{
		$("#projectionDisplayList>button").removeClass("toggled");
		ui.projectionDisplayButtons[mode].addClass("toggled");
		
		if (!planet) return;

		if (projectionRenderMode === "globe")
		{
			scene.remove(planet.renderData.surface.renderObject);
		}
		else
		{
			scene.remove(planet.renderData.surface.mapRenderObject);
		}

		projectionRenderMode = mode;
		
		if (mode === "globe")
		{
			scene.add(planet.renderData.surface.renderObject);
			setSurfaceRenderMode(surfaceRenderMode, true);
		}
		else
		{
			renderMap();
		}
	}
}

function setSurfaceRenderMode(mode, force)
{
	if (mode !== surfaceRenderMode || force === true)
	{
		$("#surfaceDisplayList>button").removeClass("toggled");
		ui.surfaceDisplayButtons[mode].addClass("toggled");

		surfaceRenderMode = mode;
		
		if (!planet) return;

		var colors;
		var geometry;
		if (projectionRenderMode === "globe")
		{
			geometry = planet.renderData.surface.geometry;
			if (mode === "terrain") colors = planet.renderData.surface.terrainColors;
			else if (mode === "plates") colors = planet.renderData.surface.plateColors;
			else if (mode === "elevation") colors = planet.renderData.surface.elevationColors;
			else if (mode === "temperature") colors = planet.renderData.surface.temperatureColors;
			else if (mode === "moisture") colors = planet.renderData.surface.moistureColors;
			else return;
		}
		else
		{
			geometry = planet.renderData.surface.mapGeometry;
			if (mode === "terrain") colors = planet.renderData.surface.mapColorArrays.terrainColors;
			else if (mode === "plates") colors = planet.renderData.surface.mapColorArrays.plateColors;
			else if (mode === "elevation") colors = planet.renderData.surface.mapColorArrays.elevationColors;
			else if (mode === "temperature") colors = planet.renderData.surface.mapColorArrays.temperatureColors;
			else if (mode === "moisture") colors = planet.renderData.surface.mapColorArrays.moistureColors;
			else return;
		}

		var faces = geometry.faces;
		for (var i = 0; i < faces.length; ++i) faces[i].vertexColors = colors[i];
		
		geometry.colorsNeedUpdate = true;
	}
}

function showHideSunlight(show)
{
	if (typeof(show) === "boolean") renderSunlight = show;
	else renderSunlight = !renderSunlight;
	if (renderSunlight) ui.showSunlightButton.addClass("toggled");
	if (!renderSunlight) ui.showSunlightButton.removeClass("toggled");

	if (!planet) return;
	
	var material = planet.renderData.surface.material;
	if (renderSunlight)
	{
		material.color = new THREE.Color(0xFFFFFF);
		material.ambient = new THREE.Color(0x444444);
	}
	else
	{
		material.color = new THREE.Color(0x000000);
		material.ambient = new THREE.Color(0xFFFFFF);
	}
	material.needsUpdate = true;
}

function showHidePlateBoundaries(show)
{
	if (typeof(show) === "boolean") renderPlateBoundaries = show;
	else renderPlateBoundaries = !renderPlateBoundaries;
	if (renderPlateBoundaries) ui.showPlateBoundariesButton.addClass("toggled");
	if (!renderPlateBoundaries) ui.showPlateBoundariesButton.removeClass("toggled");

	if (!planet) return;
	
	if (renderPlateBoundaries)
	{
		planet.renderData.surface.renderObject.add(planet.renderData.plateBoundaries.renderObject);
		planet.renderData.surface.mapRenderObject.add(planet.renderData.plateBoundaries.mapRenderObject);
	}
	else
	{
		planet.renderData.surface.renderObject.remove(planet.renderData.plateBoundaries.renderObject);
		planet.renderData.surface.mapRenderObject.remove(planet.renderData.plateBoundaries.mapRenderObject);
	}
}

function showHidePlateMovements(show)
{
	if (typeof(show) === "boolean") renderPlateMovements = show;
	else renderPlateMovements = !renderPlateMovements;
	if (renderPlateMovements) ui.showPlateMovementsButton.addClass("toggled");
	if (!renderPlateMovements) ui.showPlateMovementsButton.removeClass("toggled");

	if (!planet) return;
	
	if (renderPlateMovements)
	{
		planet.renderData.surface.renderObject.add(planet.renderData.plateMovements.renderObject);
		planet.renderData.surface.mapRenderObject.add(planet.renderData.plateMovements.mapRenderObject);
	}
	else
	{
		planet.renderData.surface.renderObject.remove(planet.renderData.plateMovements.renderObject);
		planet.renderData.surface.mapRenderObject.remove(planet.renderData.plateMovements.mapRenderObject);
	}
}

function showHideAirCurrents(show)
{
	if (typeof(show) === "boolean") renderAirCurrents = show;
	else renderAirCurrents = !renderAirCurrents;
	if (renderAirCurrents) ui.showAirCurrentsButton.addClass("toggled");
	if (!renderAirCurrents) ui.showAirCurrentsButton.removeClass("toggled");

	if (!planet) return;
	
	if (renderAirCurrents)
	{
		planet.renderData.surface.renderObject.add(planet.renderData.airCurrents.renderObject);
		planet.renderData.surface.mapRenderObject.add(planet.renderData.airCurrents.mapRenderObject);
	}
	else
	{
		planet.renderData.surface.renderObject.remove(planet.renderData.airCurrents.renderObject);
		planet.renderData.surface.mapRenderObject.remove(planet.renderData.airCurrents.mapRenderObject);
	}
}

function serializePlanetMesh(mesh, prefix, suffix)
{
	var stringPieces = [];
	
	stringPieces.push(prefix, "{nodes:[");
	for (var i = 0; i < mesh.nodes.length; ++i)
	{
		var node = mesh.nodes[i];
		stringPieces.push(i !== 0 ? ",\n{p:new THREE.Vector3(" : "\n{p:new THREE.Vector3(", node.p.x.toString(), ",", node.p.y.toString(), ",", node.p.z.toString(), "),e:[", node.e[0].toFixed(0));
		for (var j = 1; j < node.e.length; ++j) stringPieces.push(",", node.e[j].toFixed(0));
		stringPieces.push("],f:[", node.f[0].toFixed(0));
		for (var j = 1; j < node.f.length; ++j) stringPieces.push(",", node.f[j].toFixed(0));
		stringPieces.push("]}");
	}
	stringPieces.push("\n],edges:[");
	for (var i = 0; i < mesh.edges.length; ++i)
	{
		var edge = mesh.edges[i];
		stringPieces.push(i !== 0 ? ",\n{n:[" : "\n{n:[", edge.n[0].toFixed(0), ",", edge.n[1].toFixed(0), "],f:[", edge.f[0].toFixed(0), ",", edge.f[1].toFixed(0), "]}");
	}
	stringPieces.push("\n],faces:[");
	for (var i = 0; i < mesh.faces.length; ++i)
	{
		var face = mesh.faces[i];
		stringPieces.push(i !== 0 ? ",\n{n:[" : "\n{n:[", face.n[0].toFixed(0), ",", face.n[1].toFixed(0), ",", face.n[2].toFixed(0), "],e:[", face.e[0].toFixed(0), ",", face.e[1].toFixed(0), ",", face.e[2].toFixed(0), "]}");
	}
	stringPieces.push("\n]}", suffix);
	
	return stringPieces.join("");
}

function Corner(id, position, cornerCount, borderCount, tileCount)
{
	this.id = id;
	this.position = position;
	this.corners = new Array(cornerCount);
	this.borders = new Array(borderCount);
	this.tiles = new Array(tileCount);
}

Corner.prototype.vectorTo = function Corner_vectorTo(corner)
{
	return corner.position.clone().sub(this.position);
};

Corner.prototype.toString = function Corner_toString()
{
	return "Corner " + this.id.toFixed(0) + " < " + this.position.x.toFixed(0) + ", " + this.position.y.toFixed(0) + ", " + this.position.z.toFixed(0) + " >";
};

function Border(id, cornerCount, borderCount, tileCount)
{
	this.id = id;
	this.corners = new Array(cornerCount);
	this.borders = new Array(borderCount);
	this.tiles = new Array(tileCount);
}

Border.prototype.oppositeCorner = function Border_oppositeCorner(corner)
{
	return (this.corners[0] === corner) ? this.corners[1] : this.corners[0];
};

Border.prototype.oppositeTile = function Border_oppositeTile(tile)
{
	return (this.tiles[0] === tile) ? this.tiles[1] : this.tiles[0];
};

Border.prototype.length = function Border_length()
{
	return this.corners[0].position.distanceTo(this.corners[1].position);
};

Border.prototype.isLandBoundary = function Border_isLandBoundary()
{
	return (this.tiles[0].elevation > 0) !== (this.tiles[1].elevation > 0);
};

Border.prototype.toString = function Border_toString()
{
	return "Border " + this.id.toFixed(0);
};

function Tile(id, position, cornerCount, borderCount, tileCount)
{
	this.id = id;
	this.position = position;
	this.corners = new Array(cornerCount);
	this.borders = new Array(borderCount);
	this.tiles = new Array(tileCount);
}

Tile.prototype.intersectRay = function Tile_intersectRay(ray)
{
	if (!intersectRayWithSphere(ray, this.boundingSphere)) return false;

	var surface = new THREE.Plane().setFromNormalAndCoplanarPoint(this.normal, this.averagePosition);
	if (surface.distanceToPoint(ray.origin) <= 0) return false;

	var denominator = surface.normal.dot(ray.direction);
	if (denominator === 0) return false;

	var t = -(ray.origin.dot(surface.normal) + surface.constant) / denominator;
	var point = ray.direction.clone().multiplyScalar(t).add(ray.origin);
	
	var origin = new Vector3(0, 0, 0);
	for (var i = 0; i < this.corners.length; ++i)
	{
		var j = (i + 1) % this.corners.length;
		var side = new THREE.Plane().setFromCoplanarPoints(this.corners[j].position, this.corners[i].position, origin);

		if (side.distanceToPoint(point) < 0) return false;
	}
	
	return true;
};

Tile.prototype.toString = function Tile_toString()
{
	return "Tile " + this.id.toFixed(0) + " (" + this.tiles.length.toFixed(0) + " Neighbors) < " + this.position.x.toFixed(0) + ", " + this.position.y.toFixed(0) + ", " + this.position.z.toFixed(0) + " >";
};

function Plate(color, driftAxis, driftRate, spinRate, elevation, oceanic, root)
{
	this.color = color;
	this.driftAxis = driftAxis;
	this.driftRate = driftRate;
	this.spinRate = spinRate;
	this.elevation = elevation;
	this.oceanic = oceanic;
	this.root = root;
	this.tiles = [];
	this.boundaryCorners = [];
	this.boundaryBorders = [];
}

Plate.prototype.calculateMovement = function Plate_calculateMovement(position)
{
	var movement = this.driftAxis.clone().cross(position).setLength(this.driftRate * position.clone().projectOnVector(this.driftAxis).distanceTo(position));
	movement.add(this.root.position.clone().cross(position).setLength(this.spinRate * position.clone().projectOnVector(this.root.position).distanceTo(position)));
	return movement;
};

function SpatialPartition(boundingSphere, partitions, tiles)
{
	this.boundingSphere = boundingSphere;
	this.partitions = partitions;
	this.tiles = tiles;
}

SpatialPartition.prototype.intersectRay = function SpatialPartition_intersectRay(ray)
{
	if (intersectRayWithSphere(ray, this.boundingSphere))
	{
		for (var i = 0; i < this.partitions.length; ++i)
		{
			var intersection = this.partitions[i].intersectRay(ray);
			if (intersection !== false)
			{
				return intersection;
			}
		}

		for (var i = 0; i < this.tiles.length; ++i)
		{
			if (this.tiles[i].intersectRay(ray))
			{
				return this.tiles[i];
			}
		}
	}

	return false;
};
