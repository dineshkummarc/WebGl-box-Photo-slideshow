var gl; // global WebGL object
var shaderProgram;

var pics_names=[
    'images/0.png',
    'images/1.jpg',
    'images/2.jpg',
    'images/3.jpg',
    'images/4.jpg',
    'images/5.jpg',
    'images/6.jpg',
    'images/7.jpg',
    'images/8.jpg',
    'images/9.jpg'
];
var pics_num=pics_names.length;

// diffirent initializations

function initGL(canvas) {
    try {
        gl = canvas.getContext('experimental-webgl');
        gl.viewportWidth = canvas.width;
        gl.viewportHeight = canvas.height;
    } catch (e) {}
    if (! gl) {
        alert('Can`t initialise WebGL, not supported');
    }
}

function getShader(gl, type) {
    var str = '';
    var shader;

    if (type == 'x-fragment') {
        str = "#ifdef GL_ES\n"+
"precision highp float;\n"+
"#endif\n"+
"varying vec2 vTextureCoord;\n"+
"uniform sampler2D uSampler;\n"+
"void main(void) {\n"+
"    gl_FragColor = texture2D(uSampler, vec2(vTextureCoord.s, vTextureCoord.t));\n"+
"}\n";
        shader = gl.createShader(gl.FRAGMENT_SHADER);
    } else if (type == 'x-vertex') {
        str = "attribute vec3 aVertexPosition;\n"+
"attribute vec2 aTextureCoord;\n"+
"uniform mat4 uMVMatrix;\n"+
"uniform mat4 uPMatrix;\n"+
"varying vec2 vTextureCoord;\n"+
"void main(void) {\n"+
"    gl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);\n"+
"    vTextureCoord = aTextureCoord;\n"+
"}\n";
        shader = gl.createShader(gl.VERTEX_SHADER);
    } else {
        return null;
    }

    gl.shaderSource(shader, str);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert(gl.getShaderInfoLog(shader));
        return null;
    }
    return shader;
}

function initShaders() {
    var fragmentShader = getShader(gl, 'x-fragment');
    var vertexShader = getShader(gl, 'x-vertex');

    shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        alert('Can`t initialise shaders');
    }

    gl.useProgram(shaderProgram);

    shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, 'aVertexPosition');
    gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

    shaderProgram.textureCoordAttribute = gl.getAttribLocation(shaderProgram, 'aTextureCoord');
    gl.enableVertexAttribArray(shaderProgram.textureCoordAttribute);

    shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, 'uPMatrix');
    shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, 'uMVMatrix');
    shaderProgram.samplerUniform = gl.getUniformLocation(shaderProgram, 'uSampler');
}

var objVertexPositionBuffer=new Array();
var objVertexTextureCoordBuffer=new Array();
var objVertexIndexBuffer=new Array();

function initObjBuffers() {
    for (var i=0;i<4;i=i+1) {
        objVertexPositionBuffer[i] = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, objVertexPositionBuffer[i]);
        vertices = [
            Math.cos(i*((2*Math.PI)/4)), -0.5,  Math.sin(i*((2*Math.PI)/4)),
            Math.cos(i*((2*Math.PI)/4)), 0.5,  Math.sin(i*((2*Math.PI)/4)),
            Math.cos((i+1)*((2*Math.PI)/4)), 0.5, Math.sin((i+1)*((2*Math.PI)/4)),
            Math.cos((i+1)*((2*Math.PI)/4)), -0.5,  Math.sin((i+1)*((2*Math.PI)/4)),
        ];
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
        objVertexPositionBuffer[i].itemSize = 3;
        objVertexPositionBuffer[i].numItems = 4;

        objVertexTextureCoordBuffer[i] = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER,  objVertexTextureCoordBuffer[i] );
        var textureCoords = [
            1.0, 0.0,
            1.0, 1.0,
            0.0, 1.0,
            0.0, 0.0,
        ];
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoords), gl.STATIC_DRAW);
        objVertexTextureCoordBuffer[i].itemSize = 2;
        objVertexTextureCoordBuffer[i].numItems = 4;

        objVertexIndexBuffer[i] = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, objVertexIndexBuffer[i]);
        var objVertexIndices = [
            0, 1, 2,
            0, 2, 3,  
        ];
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(objVertexIndices), gl.STATIC_DRAW);
        objVertexIndexBuffer[i].itemSize = 1;
        objVertexIndexBuffer[i].numItems = 6;
    }
}

function handleLoadedTexture(texture) {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture.image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.bindTexture(gl.TEXTURE_2D, null);
}

var crateTextures = Array();
var usedTextures = Array();
function initTexture(image) {
    var texture = gl.createTexture(); // allocate texture
    texture.image = new Image();

    texture.image.onload = function () {
        handleLoadedTexture(texture);
    }
    texture.image.src = image;
    return texture;
}

function initTextures() {
    for (var i=0; i < pics_num; i++) {
        crateTextures[i]=initTexture(pics_names[i]);
    }
    usedTextures = crateTextures.slice(0, 2);
}

var mvMatrix = mat4.create();
var mvMatrixStack = [];
var pMatrix = mat4.create();

function setMatrixUniforms() {
    gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);
    gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
}

function degToRad(degrees) {
    return degrees * Math.PI / 180;
}

var yRot = -45;
var ySpeed = 40;
var z = -2.5;
var iPause = 1000;
var bPause = false;

var RotationMatrix = mat4.create();
mat4.identity(RotationMatrix);

// Draw scene and initialization

var MoveMatrix = mat4.create();
mat4.identity(MoveMatrix);

var iStep = 0;
var iCurStep = 0;
var bStep = 0;

function drawScene() {
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    mat4.perspective(45, gl.viewportWidth / gl.viewportHeight, 0.1, 100.0, pMatrix);
    mat4.identity(mvMatrix);
    mat4.translate(mvMatrix, [0.0, 0.0, z]);
    mat4.rotate(mvMatrix, degToRad(yRot), [0, 1, 0]);
    mat4.multiply(mvMatrix, MoveMatrix);
    mat4.multiply(mvMatrix, RotationMatrix);

    iStep = (parseInt((yRot+45) / 90)) % pics_num;

    if (iCurStep != iStep) {
        iCurStep = iStep;

        var bChange = (iCurStep) % 2;
        var bChange2 = (iCurStep+1) % 2;

        if (iCurStep+2 > pics_num) {
            iCurStep = 1;
            usedTextures[0] = crateTextures[0];
        } else {
            bPause = true;

            if (bChange)
                usedTextures[0] = crateTextures[iCurStep+1];

            if (bChange2)
                usedTextures[1] = crateTextures[iCurStep+1];
        }
    }

    for (var i=0;i<4;i=i+1) {
        gl.bindBuffer(gl.ARRAY_BUFFER, objVertexPositionBuffer[i]);
        gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, objVertexPositionBuffer[i].itemSize, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, objVertexTextureCoordBuffer[i]);
        gl.vertexAttribPointer(shaderProgram.textureCoordAttribute, objVertexTextureCoordBuffer[i].itemSize, gl.FLOAT, false, 0, 0);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, usedTextures[i % 2]);
        gl.uniform1i(shaderProgram.samplerUniform, 0);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, objVertexIndexBuffer[i]);
        setMatrixUniforms();
        gl.drawElements(gl.TRIANGLES, objVertexIndexBuffer[i].numItems, gl.UNSIGNED_SHORT, 0);
    }
}

var lastTime = 0;
var iElapsed = 0;
function animate() {
    var timeNow = new Date().getTime();
    if (lastTime != 0 && bPause == false) {
        var elapsed = timeNow - lastTime;
        yRot += (ySpeed * elapsed) / 1000.0;
    }
    if (bPause == true) {
        var elapsed = timeNow - lastTime;
        iElapsed += elapsed;
        if (iElapsed > iPause) {
            bPause = false;
            iElapsed = 0;
        }
    }
    lastTime = timeNow;
}

function drawFrame() {
    requestAnimFrame(drawFrame);
    drawScene();
    animate();
}

function initWebGl() {
    var canvas = document.getElementById('panel');
    initGL(canvas);
    initShaders();
    initObjBuffers();
    initTextures();

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.enable(gl.DEPTH_TEST);

    drawFrame();
}