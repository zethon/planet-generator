////////////////////////////////////////////////////////////////////////////////
// PLANET GENERATOR UTILITIES                                                 //
// Utility functions, data structures, and helper classes                    //
////////////////////////////////////////////////////////////////////////////////

function Signal()
{
	this.nextToken = 1;
	this.listeners = {};
}

Signal.prototype.addListener = function Signal_addListener(callback, token)
{
	if (typeof(token) !== "string")
	{
		token = this.nextToken.toFixed(0);
		this.nextToken += 1;
	}
	this.listeners[token] = callback;
};

Signal.prototype.removeListener = function Signal_removeListener(token)
{
	delete this.listeners[token];
};

Signal.prototype.fire = function Signal_fire()
{
	for (var key in this.listeners)
	{
		if (this.listeners.hasOwnProperty(key))
		{
			this.listeners[key].apply(null, arguments);
		}
	}
};

function XorShift128(x, y, z, w)
{
	this.x = (x ? x >>> 0 : 123456789);
	this.y = (y ? y >>> 0 : 362436069);
	this.z = (z ? z >>> 0 : 521288629);
	this.w = (w ? w >>> 0 : 88675123);
}

XorShift128.prototype.next = function XorShift128_next()
{
	var t = this.x ^ (this.x << 11) & 0x7FFFFFFF;
	this.x = this.y;
	this.y = this.z;
	this.z = this.w;
	this.w = (this.w ^ (this.w >> 19)) ^ (t ^ (t >> 8));
	return this.w;
};

XorShift128.prototype.unit = function XorShift128_unit()
{
	return this.next() / 0x80000000;
};

XorShift128.prototype.unitInclusive = function XorShift128_unitInclusive()
{
	return this.next() / 0x7FFFFFFF;
};

XorShift128.prototype.integer = function XorShift128_integer(min, max)
{
	return this.integerExclusive(min, max + 1);
};

XorShift128.prototype.integerExclusive = function XorShift128_integerExclusive(min, max)
{
	min = Math.floor(min);
	max = Math.floor(max);
	return Math.floor(this.unit() * (max - min)) + min;
};

XorShift128.prototype.real = function XorShift128_real(min, max)
{
	return this.unit() * (max - min) + min;
};

XorShift128.prototype.realInclusive = function XorShift128_realInclusive(min, max)
{
	return this.unitInclusive() * (max - min) + min;
};

XorShift128.prototype.reseed = function XorShift128_reseed(x, y, z, w)
{
	this.x = (x ? x >>> 0 : 123456789);
	this.y = (y ? y >>> 0 : 362436069);
	this.z = (z ? z >>> 0 : 521288629);
	this.w = (w ? w >>> 0 : 88675123);
};

function saveToFileSystem(content)
{
	var requestFileSystem = window.requestFileSystem || window.webkitRequestFileSystem;

	requestFileSystem(window.TEMPORARY, content.length,
		function(fs)
		{
			fs.root.getFile("planetMesh.js", { create: true },
				function (fileEntry)
				{
					fileEntry.createWriter(
						function (fileWriter)
						{
							fileWriter.addEventListener("writeend",
								function()
								{
									$("body").append("<a href=\"" + fileEntry.toURL() + "\" download=\"planetMesh.js\" target=\"_blank\">Mesh Data</a>");
									$("body>a").focus();
								}, false);

							fileWriter.write(new Blob([content]));
						},
						function (error) {});
				},
				function (error) {});
		},
		function (error) {});
}

function slerp(p0, p1, t)
{
	var omega = Math.acos(p0.dot(p1));
	return p0.clone().multiplyScalar(Math.sin((1 - t) * omega)).add(p1.clone().multiplyScalar(Math.sin(t * omega))).divideScalar(Math.sin(omega));
}

function randomUnitVector(random)
{
	var theta = random.real(0, Math.PI * 2);
	var phi = Math.acos(random.realInclusive(-1, 1));
	var sinPhi = Math.sin(phi);
	return new Vector3(
		Math.cos(theta) * sinPhi,
		Math.sin(theta) * sinPhi,
		Math.cos(phi));
}

function randomQuaternion(random)
{
	var theta = random.real(0, Math.PI * 2);
	var phi = Math.acos(random.realInclusive(-1, 1));
	var sinPhi = Math.sin(phi);
	var gamma = random.real(0, Math.PI * 2);
	var sinGamma = Math.sin(gamma);
	return new Quaternion(
		Math.cos(theta) * sinPhi * sinGamma,
		Math.sin(theta) * sinPhi * sinGamma,
		Math.cos(phi) * sinGamma,
		Math.cos(gamma));
}

function intersectRayWithSphere(ray, sphere)
{
	var v1 = sphere.center.clone().sub(ray.origin);
	var v2 = v1.clone().projectOnVector(ray.direction);
	var d = v1.distanceTo(v2);
	return (d <= sphere.radius);
}

function calculateTriangleArea(pa, pb, pc)
{
	var vab = new THREE.Vector3().subVectors(pb, pa);
	var vac = new THREE.Vector3().subVectors(pc, pa);
	var faceNormal = new THREE.Vector3().crossVectors(vab, vac);
	var vabNormal = new THREE.Vector3().crossVectors(faceNormal, vab).normalize();
	var plane = new THREE.Plane().setFromNormalAndCoplanarPoint(vabNormal, pa);
	var height = plane.distanceToPoint(pc);
	var width = vab.length();
	var area = width * height * 0.5;
	return area;
}

function accumulateArray(array, state, accumulator)
{
	for (var i = 0; i < array.length; ++i)
	{
		state = accumulator(state, array[i]);
	}
	return state;
}

function adjustRange(value, oldMin, oldMax, newMin, newMax)
{
	return (value - oldMin) / (oldMax - oldMin) * (newMax - newMin) + newMin;
}

//Adapted from http://stackoverflow.com/a/7616484/3874364
function hashString(s)
{
	var hash = 0;
	var length = s.length;
	if (length === 0) return hash;
	for (var i = 0; i < length; ++i)
	{
		var character = s.charCodeAt(1);
		hash = ((hash << 5) - hash) + character;
		hash |= 0;
	}
	return hash;
}

// Data structure classes
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
	return "Corner[" + this.id + "]";
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
	if (this.corners[0] === corner) return this.corners[1];
	if (this.corners[1] === corner) return this.corners[0];
	throw "Given corner is not part of given border.";
};

Border.prototype.oppositeTile = function Border_oppositeTile(tile)
{
	if (this.tiles[0] === tile) return this.tiles[1];
	if (this.tiles[1] === tile) return this.tiles[0];
	throw "Given tile is not part of given border.";
};

Border.prototype.length = function Border_length()
{
	return this.corners[0].position.distanceTo(this.corners[1].position);
};

Border.prototype.isLandBoundary = function Border_isLandBoundary()
{
	return this.tiles[0].elevation > 0 && this.tiles[1].elevation > 0;
};

Border.prototype.toString = function Border_toString()
{
	return "Border[" + this.id + "]";
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
	return intersectRayWithSphere(ray, this.boundingSphere);
};

Tile.prototype.toString = function Tile_toString()
{
	return "Tile[" + this.id + "]";
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
}

Plate.prototype.calculateMovement = function Plate_calculateMovement(position)
{
	var drift = this.driftAxis.clone().multiplyScalar(this.driftRate);
	var spin = position.clone().cross(this.driftAxis.clone().normalize()).multiplyScalar(this.spinRate);
	return drift.add(spin);
};

function SpatialPartition(boundingSphere, partitions, tiles)
{
	this.boundingSphere = boundingSphere;
	this.partitions = partitions;
	this.tiles = tiles;
}

SpatialPartition.prototype.intersectRay = function SpatialPartition_intersectRay(ray)
{
	if (!intersectRayWithSphere(ray, this.boundingSphere))
	{
		return null;
	}

	if (this.partitions !== null)
	{
		var subResult = null;
		for (var i = 0; i < this.partitions.length; ++i)
		{
			var partitionResult = this.partitions[i].intersectRay(ray);
			if (partitionResult !== null && (subResult === null || subResult.distance > partitionResult.distance))
			{
				subResult = partitionResult;
			}
		}
		return subResult;
	}
	else
	{
		var result = null;
		for (var i = 0; i < this.tiles.length; ++i)
		{
			if (this.tiles[i].intersectRay(ray))
			{
				var distance = ray.origin.distanceTo(this.tiles[i].position);
				if (result === null || result.distance > distance)
				{
					result = { tile: this.tiles[i], distance: distance };
				}
			}
		}
		return result;
	}
};

// SteppedAction class for async operations
function SteppedAction(progressUpdater, unbrokenInterval, sleepInterval)
{
	this.progressUpdater = progressUpdater;
	this.unbrokenInterval = unbrokenInterval ? unbrokenInterval : 20;
	this.sleepInterval = sleepInterval ? sleepInterval : 1;
	
	this.completed = false;
	this.canceled = false;
	this.result = null;
	this.intervalEndTime = Date.now();
	this.intervalIteration = 0;
	
	this.activeSubactions = [];
	this.subactionProgress = 0;
	this.subactionProgressRange = 0;
}

SteppedAction.prototype.execute = function SteppedAction_execute()
{
	var that = this;
	setTimeout(function()
	{
		that.intervalEndTime = Date.now() + that.unbrokenInterval;
		that.step();
	}, this.sleepInterval);
};

SteppedAction.prototype.step = function SteppedAction_step()
{
	while (Date.now() < this.intervalEndTime && !this.canceled && !this.completed)
	{
		if (this.activeSubactions.length > 0)
		{
			var subaction = this.activeSubactions[this.activeSubactions.length - 1];
			subaction.func.call(null, subaction.action);
		}
		++this.intervalIteration;
		if (this.progressUpdater !== null) this.progressUpdater(this);
	}
	
	if (!this.completed && !this.canceled)
	{
		this.execute();
	}
	else if (this.progressUpdater !== null)
	{
		this.progressUpdater(this);
	}
};

SteppedAction.prototype.beginSubactions = function(parentProgress, parentProgressRange)
{
	this.subactionProgress = parentProgress;
	this.subactionProgressRange = parentProgressRange;
};

SteppedAction.prototype.cancel = function SteppedAction_cancel()
{
	this.canceled = true;
};

SteppedAction.prototype.provideResult = function SteppedAction_provideResult(resultProvider)
{
	this.result = (typeof(resultProvider) === "function") ? resultProvider() : resultProvider;
	this.completed = true;
	return this;
};

SteppedAction.prototype.loop = function SteppedAction_loop(progress)
{
	if (this.activeSubactions.length > 0)
	{
		this.activeSubactions[this.activeSubactions.length - 1].action.intervalIteration = this.intervalIteration;
		this.activeSubactions[this.activeSubactions.length - 1].progress = progress;
	}
	return this;
};

SteppedAction.prototype.executeSubaction = function SteppedAction_executeSubaction(subaction, proportion, name)
{
	var action = new SteppedAction(null, this.unbrokenInterval, this.sleepInterval);
	action.beginSubactions(this.subactionProgress, proportion / this.subactionProgressRange);
	action.intervalIteration = this.intervalIteration;
	
	this.activeSubactions.push({
		func: subaction,
		action: action,
		proportion: proportion,
		name: name,
		progress: 0
	});
	
	return this;
};

SteppedAction.prototype.getResult = function SteppedAction_getResult(recipient)
{
	if (this.activeSubactions.length > 0)
	{
		var subaction = this.activeSubactions[this.activeSubactions.length - 1];
		if (subaction.action.completed && subaction.action.result !== null)
		{
			recipient(subaction.action.result);
			this.activeSubactions.pop();
		}
	}
	return this;
};

SteppedAction.prototype.finalize = function SteppedAction_finalize(finalizer)
{
	if (this.activeSubactions.length === 0)
	{
		finalizer.call(null, this);
	}
	return this;
};

SteppedAction.prototype.getTimeRemainingInInterval = function SteppedAction_getTimeRemainingInInterval()
{
	return Math.max(0, this.intervalEndTime - Date.now());
};

SteppedAction.prototype.getProgress = function SteppedAction_getProgress()
{
	var callStack = this.activeSubactions.length > 0 ? this.activeSubactions[this.activeSubactions.length - 1] : null;
	var progress = this.subactionProgress;
	
	while (callStack !== null)
	{
		var subactionProgress = callStack.progress * callStack.action.subactionProgressRange + callStack.action.subactionProgress;
		progress += subactionProgress * callStack.proportion;
		callStack = callStack.action.activeSubactions.length > 0 ? callStack.action.activeSubactions[callStack.action.activeSubactions.length - 1] : null;
	}
	
	return progress;
};

SteppedAction.prototype.getCurrentActionName = function SteppedAction_getCurrentActionName()
{
	var callStack = this.activeSubactions.length > 0 ? this.activeSubactions[this.activeSubactions.length - 1] : null;
	while (callStack !== null)
	{
		if (callStack.action.activeSubactions.length > 0)
		{
			callStack = callStack.action.activeSubactions[callStack.action.activeSubactions.length - 1];
		}
		else
		{
			return callStack.name;
		}
	}
	return null;
};
