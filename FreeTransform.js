(function() {
	$(document).bind("touchstart", function(event) {
		var t = event.originalEvent.changedTouches;
		for (var i=0; i<t.length; i++) onTouchStart(t.item(i), event);
	})
	.bind("touchmove", function(event) {
		var t = event.originalEvent.changedTouches;
		for (var i=0; i<t.length; i++) onTouchMove(t.item(i), event);
	})
	.bind("touchend touchcancel", function(event) {
		var t = event.originalEvent.changedTouches;
		for (var i=0; i<t.length; i++) onTouchEnd(t.item(i), event);
	});
	
	function onTouchStart(touch, event) {
		var target = findTarget(touch.target);
		if (target) {
			target.addTouch(touch.identifier, touch.pageX, touch.pageY);
			event.preventDefault();
		}
		else {
			target = findNearestTarget(touch.pageX, touch.pageY);
			if (target) {
				var added = target.addTouchOpt(touch.identifier, touch.pageX, touch.pageY);
				if (added) {
					$(touch.target).data("freeTransformTarget", target);
					event.preventDefault();
				}
			}
		}
	}
	function onTouchMove(touch, event) {
		var target = findTarget(touch.target);
		if (target) {
			target.moveTouch(touch.identifier, touch.pageX, touch.pageY);
			event.preventDefault();
		}
	}
	function onTouchEnd(touch, event) {
		var target = findTarget(touch.target);
		if (target) {
			target.removeTouch(touch.identifier);
			event.preventDefault();
		}
		$(touch.target).removeData("freeTransformTarget");
	}
	
	function findTarget(elem) {
		var target = $(elem).data("freeTransformTarget");
		if (!target) {
			while (elem && !$(elem).hasClass("free-transform")) elem = elem.parentElement;
			if (elem) {
				target = $(elem).data("freeTransform");
				if (!target) $(elem).data("freeTransform", target = new FreeTransform(elem));
			}
		}
		return target;
	}
	function findNearestTarget(x, y) {
		var target = null;
		var distance = Number.MAX_VALUE;
		$(".free-transform").each(function() {
			var t = findTarget(this);
			var a = t.getAnchor();
			var d = !a ? Number.MAX_VALUE : (x-a.x)*(x-a.x)+(y-a.y)*(y-a.y);
			if (d < distance) {
				target = t;
				distance = d;
			}
		});
		return target;
	}
	
	function FreeTransform(elem) {
		var bounds = $(elem).offset();
		bounds.width = $(elem).outerWidth();
		bounds.height = $(elem).outerHeight();
		
		var t = [];
		var matrix = Matrix.translate(Matrix.identity(), bounds.left+bounds.width/2, bounds.top+bounds.height/2);
		$(elem).css({position: "absolute", left: -bounds.width/2, top: -bounds.height/2});
		update();
		
		this.addTouch = function(id, x, y) {
			t.push({id:id, x:x, y:y});
		};
		this.addTouchOpt = function(id, x, y) {
			if (t.length == 1) {
				t.push({id:id, x:x, y:y});
				return true;
			}
			else return false;
		};
		this.moveTouch = function(id, x, y) {
			for (var i=0; i<t.length; i++)
				if (t[i].id == id) {
					t[i].pending = {x:x, y:y};
					break;
				}
			update();
		};
		this.removeTouch = function(id) {
			applyPending();
			for (var i=0; i<t.length; i++)
				if (t[i].id == id) {
					t.splice(i,1);
					break;
				}
			update();
		};
		this.getAnchor = function() {
			return t[0];
		};
		
		function applyPending() {
			matrix = calcPending();
			for (var i=0; i<t.length; i++)
				if (t[i].pending) {
					t[i].x = t[i].pending.x;
					t[i].y = t[i].pending.y;
					t[i].pending = null;
				}
		}
		function calcPending() {
			if (!t[0]) return matrix;
			var anchor = t[0];
			var anchorPending = anchor.pending || anchor;
			var arrow = t[1];
			if (!arrow || !arrow.pending) return Matrix.translate(matrix, anchorPending.x-anchor.x, anchorPending.y-anchor.y);
			else return Matrix.transform(matrix, anchor.x, anchor.y, arrow.x, arrow.y, anchorPending.x, anchorPending.y, arrow.pending.x, arrow.pending.y);
		}
		function update() {
			var val = "matrix(" + calcPending().map(toFixed).join() + ")";
			$(elem).css({"-webkit-transform": val, "transform": val});
		}
		function toFixed(num) {
			return num.toFixed(10);
		}
	}

	var Matrix = {
		transform: function(m, x1, y1, x2, y2, x3, y3, x4, y4) {
			var ux = x2-x1, uy = y2-y1, vx = x4-x3, vy = y4-y3;
			var u = Math.sqrt(ux*ux+uy*uy), v = Math.sqrt(vx*vx+vy*vy);
			var sx = v/u, sy = sx;
			var dot = ux*vx+uy*vy, cross = ux*vy-uy*vx;
			var cos = dot/(u*v), sin = cross/(u*v);
			return this.translate(this.rotate(this.scale(this.translate(m, -x1, -y1), sx, sy), cos, sin), x3, y3);
		},
		identity: function() {
			return [1, 0, 0, 1, 0, 0];
		},
		translate: function(m, tx, ty) {
			return [m[0], m[1], m[2], m[3], m[4]+tx, m[5]+ty];
		},
		scale: function(m, sx, sy) {
			return [m[0]*sx, m[1]*sy, m[2]*sx, m[3]*sy, m[4]*sx, m[5]*sy];
		},
		rotate: function(m, cos, sin) {
			return [m[0]*cos-m[1]*sin, m[0]*sin+m[1]*cos, m[2]*cos-m[3]*sin, m[2]*sin+m[3]*cos, m[4]*cos-m[5]*sin, m[4]*sin+m[5]*cos];
		},
		multiply: function(m, n) {
			return [m[0]*n[0]+m[2]*n[1], m[1]*n[0]+m[3]*n[1], m[0]*n[2]+m[2]*n[3], m[1]*n[2]+m[3]*n[3], m[0]*n[4]+m[2]*n[5]+m[4], m[1]*n[4]+m[3]*n[5]+m[5]];
		},
		determinant: function(m) {
			return m[0]*m[3]-m[1]*m[2];
		}
	};
})();
