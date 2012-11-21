/*
Copyright (c) 2010, Martin Wengenmayer ( www.cheetah3d.com )
All rights reserved.

Redistribution and use in source and binary forms, with or without modification, are 
permitted provided that the following conditions are met:

-Redistributions of source code must retain the above copyright notice, this list of 
conditions and the following disclaimer. 

-Redistributions in binary form must reproduce the above copyright notice, this list 
of conditions and the following disclaimer in the dation and/or other materials 
provided with the distribution. 

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS 
OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY 
AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER 
OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR 
CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR 
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON 
ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE 
OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE 
POSSIBILITY OF SUCH DAMAGE.
*/

(function ($, undefined) {
	
"use strict";

var w = window,
	m = w.Math,
	d = w.document,
	DEG2RAD=m.PI/180.0,
	
	// request animation frame
	raf = null,
	craf = null,
	
	_setTimeout = function (fx, canvas, delay) {
		raf = raf || w.requestAnimationFrame || w.mozRequestAnimationFrame ||  
				w.webkitRequestAnimationFrame || w.msRequestAnimationFrame ||
				w.oRequestAnimationFrame || w.setTimeout;

		return raf(fx, raf !== w.setTimeout ? canvas : delay);
	},

	_clearTimeout = function (timeout) {
		craf = w.cancelAnimationFrame || w.webkitCancelRequestAnimationFrame ||
				w.mozCancelRequestAnimationFrame || w.oCancelRequestAnimationFrame ||
				w.msCancelRequestAnimationFrame  || w.clearTimeout;

		return craf(timeout);
	},

	_createPano = function () {
		var
		
		//Canvas to which to draw the panorama
		pano_canvas=null,
	 
		//Event state
		mouseIsDown=false,
		mouseDownPosLastX=0,
		mouseDownPosLastY=0,
		displayInfo=false,
	//	highquality=true,
	
		//Camera state
		cam_heading=90.0,
		cam_pitch=90.0,
		cam_fov=90,
		
		// Image 
		img_buffer=null,
	
		_drawFrm = null,
		
		_startDraw = function () {
			if (!_drawFrm) {
				_drawFrm = _setTimeout(function _drawCallback () {
					draw();
					if (!!_drawFrm) {
						_drawFrm = null;
						_startDraw();
					}
				}, pano_canvas, 50);
			}
		},
		
		_stopDraw = function () {
			_clearTimeout(_drawFrm);
			_drawFrm = null;
		},
		
		ctx,
		
		src_width,
		src_height,
		src_ratio,
		
		dest_width,
		dest_height,
		dest_ratio,
		dest_size,
		
		theta_fac,
		phi_fac,
		
		_init_vars = function (img) {
			// init our private vars
			src_width=img.width;
			src_height=img.height;
			src_ratio=src_width/src_height;
			
			dest_width=pano_canvas.width;
			dest_height=pano_canvas.height;
			dest_ratio=dest_width/dest_height;
			dest_size=dest_width*dest_height;
			
			ctx = pano_canvas.getContext("2d");
			
			theta_fac=src_height/m.PI;
			phi_fac=src_width*0.5/m.PI;
			mouseDownPosLastY = dest_height/2;
			mouseDownPosLastX = dest_width/2;
		},
		
		_fillImgBuffer = function (img) {
			var buffer = d.createElement("canvas"),
				buffer_ctx = buffer.getContext ("2d");
			
			//set buffer size
			buffer.width = img.width;
			buffer.height = img.height;
		 	
		 	//draw image
			buffer_ctx.drawImage(img,0,0);
		 		
		 	//get pixels
		 	var buffer_imgdata = buffer_ctx.getImageData(0, 0, buffer.width, buffer.height),
		 		buffer_pixels = buffer_imgdata.data;
		 		
		 	//convert imgdata to float image buffer
		 	img_buffer = new Array(img.width * img.height * 3);
		 	for(var i=0,j=0; i<buffer_pixels.length; i+=4, j+=3){
				img_buffer[j] 	= buffer_pixels[i];
				img_buffer[j+1] = buffer_pixels[i+1];
				img_buffer[j+2] = buffer_pixels[i+2];
			}
		},
	
		_init_pano = function (c, options) {
			if (!options || !options.src) {
				console.error('No image found');
				return;	
			}
			if (options.debug===true) {
   				displayInfo = options.debug;
   			}
			
			//get canvas and set up call backs
			pano_canvas = c; //d.getElementById(canvasid);
			//pano_canvas.onmousedown = mouseDown;
			//pano_canvas.onmousemove = mouseMove;
			//pano_canvas.onmouseup = mouseUp;
			//pano_canvas.onmousewheel = mouseScroll;
			$(c).mousedown(mouseDown)
				.mouseup(mouseUp)
				.mousemove(mouseMove)
				.on('mousewheel', mouseScroll);
				
			//w.onkeydown = keyDown;
			$(d).keydown(keyDown);
			
			// load img
			// use local variable here. this will permet
			// garbage collecting
			var img = new Image();
			img.onload = function () {
				_fillImgBuffer(img);
				_init_vars(img);
				// initial draw, one frame
				draw();	
			};
			img.src = options.src;
		},
	
		/*** MOUSE ***/
		
		mouseDown = function (e){
			mouseIsDown = true;
			mouseDownPosLastX = e.clientX;
			mouseDownPosLastY = e.clientY;
		},
	
		mouseMove = function (e){
			if(!!mouseIsDown){
				cam_heading-=(e.clientX-mouseDownPosLastX);
				cam_pitch+=0.5*(e.clientY-mouseDownPosLastY);
				cam_pitch=m.min(180,m.max(0,cam_pitch));
				mouseDownPosLastX=e.clientX;
				mouseDownPosLastY=e.clientY;	
				_startDraw();
			}
		},
	
		mouseUp = function (e){
			mouseIsDown = false;
			_stopDraw();
		},
	
		mouseScroll = function (e){
			cam_fov+=e.wheelDelta/120;
			cam_fov=m.min(90,m.max(30,cam_fov));
			_startDraw();
		},
	
		/** KEYBOARDS **/
		keyDown  = function (e){
			if(e.keyCode==73){	//i==73 Info
				displayInfo = !displayInfo;
				draw();
			}
		},
	
	
		/** RENDER **/
	
		renderPanorama = function () {
				
			var imgdata = imgdata = ctx.getImageData(0, 0, dest_width, dest_height);
			var pixels = imgdata.data;
			
			//calculate camera plane
			var ratioUp=2.0*m.tan(cam_fov*DEG2RAD/2.0);
			var ratioRight=ratioUp*1.33;
			var camDirX=m.sin(cam_pitch*DEG2RAD)*m.sin(cam_heading*DEG2RAD);
			var camDirY=m.cos(cam_pitch*DEG2RAD);
			var camDirZ=m.sin(cam_pitch*DEG2RAD)*m.cos(cam_heading*DEG2RAD);
			var camUpX=ratioUp*m.sin((cam_pitch-90.0)*DEG2RAD)*m.sin(cam_heading*DEG2RAD);
			var camUpY=ratioUp*m.cos((cam_pitch-90.0)*DEG2RAD);
			var camUpZ=ratioUp*m.sin((cam_pitch-90.0)*DEG2RAD)*m.cos(cam_heading*DEG2RAD);
			var camRightX=ratioRight*m.sin((cam_heading-90.0)*DEG2RAD);
			var camRightY=0.0;
			var camRightZ=ratioRight*m.cos((cam_heading-90.0)*DEG2RAD);
			var camPlaneOriginX=camDirX + 0.5*camUpX - 0.5*camRightX;
			var camPlaneOriginY=camDirY + 0.5*camUpY - 0.5*camRightY;
			var camPlaneOriginZ=camDirZ + 0.5*camUpZ - 0.5*camRightZ;
			
			//render image
			var	i,j;
			for(i=0;i<dest_height;i++){
				var offset = i*dest_width;
				for(j=0;j<dest_width;j++){
				/*
				THIS IS WORST
				for (var x=0;x<dest_size;x++) {
					i = ~~(x / dest_width);
					j = x % dest_width; */
					
					var	fx=j/dest_width;
					var	fy=i/dest_height;
					
					var	rayX=camPlaneOriginX + fx*camRightX - fy*camUpX;
					var	rayY=camPlaneOriginY + fx*camRightY - fy*camUpY;
					var	rayZ=camPlaneOriginZ + fx*camRightZ - fy*camUpZ;
					var	rayNorm=1.0/m.sqrt(rayX*rayX + rayY*rayY + rayZ*rayZ);
					
					var	theta=m.acos(rayY*rayNorm);
	    			var	phi=m.atan2(rayZ,rayX) + m.PI;
	    			
	    			var	theta_i=m.floor(theta_fac*theta);
	    			var	phi_i=m.floor(phi_fac*phi);
	    			
	    			var	dest_offset=4*(offset+j); // x
					var	src_offset=3*(theta_i*src_width + phi_i);
					
					pixels[dest_offset]     = img_buffer[src_offset];
					pixels[dest_offset+1]   = img_buffer[src_offset+1];
					pixels[dest_offset+2]   = img_buffer[src_offset+2];
					//pixels[dest_offset+3] = img_buffer[src_offset+3];
				}
			}
		 		
		 	//upload image data
		 	ctx.putImageData(imgdata, 0, 0);
		},
	
	
		drawRoundedRect = function (ctx,ox,oy,w,h,radius){
			ctx.beginPath();
			ctx.moveTo(ox + radius,oy);
			ctx.lineTo(ox + w - radius,oy);
			ctx.arc(ox +w-radius,oy+ radius, radius,-m.PI/2,0, false);
			ctx.lineTo(ox + w,oy + h - radius);
			ctx.arc(ox +w-radius,oy + h - radius, radius,0,m.PI/2, false);
			ctx.lineTo(ox + radius,oy + h);
			ctx.arc(ox + radius,oy + h - radius, radius,m.PI/2,m.PI, false);
			ctx.lineTo(ox,oy + radius);
			ctx.arc(ox + radius,oy + radius, radius,m.PI,3*m.PI/2, false);
			ctx.fill();	
		},
	
	
		draw = function (){
	    	//clear canvas
	    	//ctx.fillStyle = "rgba(0, 0, 0, 1)";
	    	ctx.fillRect(0,0,src_width,src_height);
			
			// not working
			//ctx.clearRect(0,0,src_width,src_height);
				
			//render paromana direct
			var startTime = new Date();
				renderPanorama();
			
			//draw info text
			if(!!displayInfo){	
				
				var endTime = new Date(),
					lastRender = (endTime.getTime()-startTime.getTime());
				
				ctx.fillStyle = "rgba(255,255,255,0.75)";
				drawRoundedRect(ctx,20,dest_height-80,180,60,7);
				
				ctx.fillStyle = "rgba(0, 0, 0, 1)";
				ctx.font="11px consolas, monosapce";
				ctx.fillText("Canvas: " +  dest_width + "x" + dest_height + " " + dest_ratio.toFixed(3), 30,dest_height-60);
				ctx.fillText("Image size: " + src_width + "x" + src_height + " " + src_ratio.toFixed(3), 30,dest_height-45);
				ctx.fillText("FPS: " + (1000.0/lastRender).toFixed(1) + " (" + lastRender + ")",         30,dest_height-30);
			
				//console.log(lastRender);
			}
		};
	
		return {
			init: _init_pano	
		};
	};
   
   // jquery plugin
   $.fn.extend({
   		panorama: function (options) {
   			var t = $(this);
   			
   			return t.each(function _eachPanorama() {
   				_createPano().init(this, options);
   			});	
   		}
   	});
   
})(jQuery);