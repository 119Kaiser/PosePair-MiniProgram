const GUIDE_RATIO = 941 / 1672
const DEFAULT_OPACITY = 0.4
const DEFAULT_OPACITY_PERCENT = 40

Page({
  data: {
    status: 'home',
    previewImage: '',
    beforeImage: '',
    afterImage: '',
    compareImage: '',
    compareTextAlign: 'center',
    textAlignButtonText: '文字靠左',
    mosaicEnabled: false,
    mosaicBlocks: [],
    mosaicViews: [],
    beforeLabel: 'Before',
    afterLabel: 'After',
    editingLabelTarget: '',
    editingLabelValue: '',
    devicePosition: 'back',
    editLayoutReady: false,
    isGeneratingCompare: false,
    isImportingBefore: false,
    isTakingPhoto: false,
    faceOutlineEnabled: false,
    faceOutlineLoading: false,
    faceOutlineImage: '',
    silhouetteEnabled: false,
    silhouetteLoading: false,
    silhouetteImage: '',
    faceCanvasWidth: 300,
    faceCanvasHeight: 300,

    currentAngle: 'front',
    angleIndicatorLeft: 40,
    guideImagePath: '/img/front.png',
    showGuide: true,
    guideWidth: 0,
    guideHeight: 0,

    overlayOpacity: DEFAULT_OPACITY,
    overlayOpacityPercent: DEFAULT_OPACITY_PERCENT,
    activeOpacityTop: 50,
    opacityOptions: [
      { percent: 80, top: 7, active: false },
      { percent: 60, top: 28.5, active: false },
      { percent: 40, top: 50, active: true },
      { percent: 20, top: 71.5, active: false },
      { percent: 0, top: 93, active: false }
    ],

    mergeCanvasWidth: 1200,
    mergeCanvasHeight: 900,
    beforeEditWidth: 240,
    beforeEditHeight: 320,
    afterEditWidth: 240,
    afterEditHeight: 320,
    beforeTransform: {
      x: 0,
      y: 0,
      scale: 1
    },
    afterTransform: {
      x: 0,
      y: 0,
      scale: 1
    },

    angles: [
      { label: '左90°', value: 'left90', guide: '/img/left90.png' },
      { label: '左45°', value: 'left45', guide: '/img/left45.png' },
      { label: '正面', value: 'front', guide: '/img/front.png' },
      { label: '右45°', value: 'right45', guide: '/img/right45.png' },
      { label: '右90°', value: 'right90', guide: '/img/right90.png' }
    ]
  },

  opacityAnimationTimer: null,
  gestureState: null,
  mosaicLastPoint: null,
  mergedDisplayRect: null,
  faceDetectInited: false,

  onReady() {
    this.updateCameraMetrics()
  },

  onResize() {
    this.updateCameraMetrics()
    if (this.data.status === 'result') {
      this.updateEditImageSize()
    }
    if (this.data.status === 'merged') {
      wx.nextTick(() => this.updateMosaicViews())
    }
  },

  startBeforeFlow() {
    this.setPortrait()
    this.ensureCameraPermission()
      .then(() => {
        this.setData({
          status: 'before',
          previewImage: '',
          beforeImage: '',
          afterImage: '',
          compareImage: '',
          compareTextAlign: 'center',
          textAlignButtonText: '文字靠左',
          mosaicEnabled: false,
          mosaicBlocks: [],
          mosaicViews: [],
          beforeLabel: 'Before',
          afterLabel: 'After',
          editingLabelTarget: '',
          editingLabelValue: '',
          devicePosition: 'back',
          editLayoutReady: false,
          isGeneratingCompare: false,
          isImportingBefore: false,
          isTakingPhoto: false,
          faceOutlineEnabled: false,
          faceOutlineLoading: false,
          faceOutlineImage: '',
          silhouetteEnabled: false,
          silhouetteLoading: false,
          silhouetteImage: '',
          showGuide: true,
          beforeTransform: this.getDefaultTransform(),
          afterTransform: this.getDefaultTransform()
        }, () => {
          wx.nextTick(() => this.updateCameraMetrics())
        })
      })
      .catch(() => {})
  },

  startAfterFlow() {
    if (this.data.isImportingBefore) {
      return
    }

    this.setData({
      isImportingBefore: true
    }, () => {
      wx.nextTick(() => this.chooseBeforeImage())
    })
  },

  chooseBeforeImage() {
    const chooseSuccess = (path) => {
      this.setPortrait()

      this.normalizeImageForCompare(path)
        .catch(() => path)
        .then((beforeImage) => {
          this.setData({
            status: 'home',
            previewImage: '',
            beforeImage,
            afterImage: '',
            compareImage: '',
            compareTextAlign: 'center',
            textAlignButtonText: '文字靠左',
            mosaicEnabled: false,
            mosaicBlocks: [],
            mosaicViews: [],
            beforeLabel: 'Before',
            afterLabel: 'After',
            editingLabelTarget: '',
            editingLabelValue: '',
            devicePosition: 'back',
            editLayoutReady: false,
            isGeneratingCompare: false,
            isImportingBefore: true,
            isTakingPhoto: false,
            faceOutlineEnabled: false,
            faceOutlineLoading: false,
            faceOutlineImage: '',
            silhouetteEnabled: false,
            silhouetteLoading: true,
            silhouetteImage: '',
            showGuide: false,
            beforeTransform: this.getDefaultTransform(),
            afterTransform: this.getDefaultTransform(),
            overlayOpacity: DEFAULT_OPACITY,
            overlayOpacityPercent: DEFAULT_OPACITY_PERCENT,
            activeOpacityTop: this.getOpacityTop(DEFAULT_OPACITY_PERCENT),
            opacityOptions: this.getOpacityOptions(DEFAULT_OPACITY_PERCENT)
          }, () => {
            this.processSilhouette(beforeImage, this.getPlannedCameraRect(), false)
          .then(() => this.ensureCameraPermission())
          .then(() => {
            this.setData({
              status: 'after',
              isImportingBefore: false,
              silhouetteLoading: false
            }, () => {
              wx.nextTick(() => {
                this.updateCameraMetrics()
                setTimeout(() => this.updateCameraMetrics(), 200)
              })
            })
          })
          .catch(() => {
            this.setData({
              isImportingBefore: false,
              silhouetteLoading: false,
              silhouetteImage: ''
            })
            wx.showToast({
              title: '图片导入失败',
              icon: 'none'
            })
          })
          })
        })
    }

    if (wx.chooseMedia) {
      wx.chooseMedia({
        count: 1,
        mediaType: ['image'],
        sizeType: ['original'],
        sourceType: ['album'],
        success: (res) => {
          chooseSuccess(res.tempFiles[0].tempFilePath)
        },
        fail: () => {
          this.setData({
            isImportingBefore: false
          })
        }
      })
      return
    }

    wx.chooseImage({
      count: 1,
      sizeType: ['original'],
      sourceType: ['album'],
      success: (res) => {
        chooseSuccess(res.tempFilePaths[0])
      },
      fail: () => {
        this.setData({
          isImportingBefore: false
        })
      }
    })
  },

  goHome() {
    this.setPortrait()
    this.setData({
      status: 'home',
      previewImage: '',
      beforeImage: '',
      afterImage: '',
      compareImage: '',
      compareTextAlign: 'center',
      textAlignButtonText: '文字靠左',
      mosaicEnabled: false,
      mosaicBlocks: [],
      mosaicViews: [],
      beforeLabel: 'Before',
      afterLabel: 'After',
      editingLabelTarget: '',
      editingLabelValue: '',
      devicePosition: 'back',
      editLayoutReady: false,
      isGeneratingCompare: false,
      isTakingPhoto: false,
      faceOutlineEnabled: false,
      faceOutlineLoading: false,
      faceOutlineImage: '',
      silhouetteEnabled: false,
      silhouetteLoading: false,
      silhouetteImage: '',
      beforeTransform: this.getDefaultTransform(),
      afterTransform: this.getDefaultTransform(),
      overlayOpacity: DEFAULT_OPACITY,
      overlayOpacityPercent: DEFAULT_OPACITY_PERCENT,
      activeOpacityTop: this.getOpacityTop(DEFAULT_OPACITY_PERCENT),
      opacityOptions: this.getOpacityOptions(DEFAULT_OPACITY_PERCENT)
    })
  },

  updateCameraMetrics() {
    const query = wx.createSelectorQuery()

    query
      .select('.camera-wrap')
      .boundingClientRect()
      .exec((res) => {
        const cameraRect = res[0]

        if (!cameraRect || !cameraRect.height) {
          return
        }

        this.setData({
          guideHeight: cameraRect.height,
          guideWidth: cameraRect.height * GUIDE_RATIO
        })
      })
  },

  selectAngle(e) {
    const currentAngle = e.currentTarget.dataset.angle
    let guideImagePath = this.data.guideImagePath
    let angleIndicatorLeft = this.data.angleIndicatorLeft

    for (let i = 0; i < this.data.angles.length; i += 1) {
      if (this.data.angles[i].value === currentAngle) {
        guideImagePath = this.data.angles[i].guide
        angleIndicatorLeft = i * 20
        break
      }
    }

    this.setData({
      currentAngle,
      angleIndicatorLeft,
      guideImagePath
    })
  },

  setGuideVisible(e) {
    const show = e.currentTarget.dataset.show
    const showGuide = show === true || show === 'true'
    const data = {
      showGuide
    }

    if (showGuide) {
      data.silhouetteEnabled = false
    }

    this.setData(data)
  },

  selectOpacity(e) {
    const percent = Number(e.currentTarget.dataset.percent)
    const top = this.getOpacityTop(percent)

    this.animateOpacityTop(top)
    this.setData({
      overlayOpacity: percent / 100,
      overlayOpacityPercent: percent,
      opacityOptions: this.getOpacityOptions(percent)
    })
  },

  animateOpacityTop(targetTop) {
    if (this.opacityAnimationTimer) {
      clearInterval(this.opacityAnimationTimer)
      this.opacityAnimationTimer = null
    }

    const startTop = this.data.activeOpacityTop
    const distance = targetTop - startTop
    const frameCount = 10
    let frame = 0

    this.opacityAnimationTimer = setInterval(() => {
      frame += 1

      const progress = frame / frameCount
      const easedProgress = 1 - Math.pow(1 - progress, 3)
      const activeOpacityTop = startTop + distance * easedProgress

      this.setData({ activeOpacityTop })

      if (frame >= frameCount) {
        clearInterval(this.opacityAnimationTimer)
        this.opacityAnimationTimer = null
        this.setData({ activeOpacityTop: targetTop })
      }
    }, 16)
  },

  getOpacityTop(percent) {
    const topMap = {
      80: 7,
      60: 28.5,
      40: 50,
      20: 71.5,
      0: 93
    }

    return topMap[percent]
  },

  getOpacityOptions(activePercent) {
    return [
      { percent: 80, top: 7, active: activePercent === 80 },
      { percent: 60, top: 28.5, active: activePercent === 60 },
      { percent: 40, top: 50, active: activePercent === 40 },
      { percent: 20, top: 71.5, active: activePercent === 20 },
      { percent: 0, top: 93, active: activePercent === 0 }
    ]
  },

  takePhoto() {
    if (this.data.isTakingPhoto) {
      return
    }

    const cameraContext = wx.createCameraContext()

    this.setData({
      isTakingPhoto: true
    }, () => {
      wx.nextTick(() => {
        this.wait(120).then(() => {
          cameraContext.takePhoto({
            quality: 'high',
            success: (res) => {
              this.setData({
                previewImage: res.tempImagePath,
                isTakingPhoto: false
              })
            },
            fail: () => {
              this.setData({
                isTakingPhoto: false
              })
              wx.showToast({
                title: '拍照失败',
                icon: 'none'
              })
            }
          })
        })
      })
    })
  },

  toggleCameraPosition() {
    this.setData({
      devicePosition: this.data.devicePosition === 'back' ? 'front' : 'back'
    })
  },

  ensureCameraPermission() {
    return new Promise((resolve, reject) => {
      const requestPermission = () => {
        if (!wx.authorize) {
          resolve()
          return
        }

        wx.authorize({
          scope: 'scope.camera',
          success: resolve,
          fail: () => {
            this.showCameraPermissionModal().then(resolve).catch(reject)
          }
        })
      }

      if (!wx.getSetting) {
        requestPermission()
        return
      }

      wx.getSetting({
        success: (res) => {
          const setting = res.authSetting || {}

          if (setting['scope.camera']) {
            resolve()
            return
          }

          requestPermission()
        },
        fail: requestPermission
      })
    })
  },

  showCameraPermissionModal() {
    return new Promise((resolve, reject) => {
      wx.showModal({
        title: '需要摄像头权限',
        content: '请在设置中打开摄像头权限，才能拍摄对比照片。',
        confirmText: '去设置',
        cancelText: '取消',
        success: (modalRes) => {
          if (!modalRes.confirm || !wx.openSetting) {
            reject(new Error('camera permission denied'))
            return
          }

          wx.openSetting({
            success: (settingRes) => {
              const setting = settingRes.authSetting || {}

              if (setting['scope.camera']) {
                resolve()
                return
              }

              reject(new Error('camera permission denied'))
            },
            fail: reject
          })
        },
        fail: reject
      })
    })
  },

  toggleFaceOutline() {
    if (this.data.faceOutlineLoading || this.data.silhouetteLoading) {
      return
    }

    if (this.data.faceOutlineEnabled) {
      this.setData({
        faceOutlineEnabled: false
      })
      return
    }

    this.setData({
      faceOutlineEnabled: true,
      silhouetteEnabled: false
    }, () => {
      if (!this.data.faceOutlineImage && !this.data.faceOutlineLoading) {
        this.processFaceOutline()
      }
    })
  },

  toggleSilhouette() {
    if (this.data.faceOutlineLoading || this.data.silhouetteLoading) {
      return
    }

    if (this.data.silhouetteEnabled) {
      this.setData({
        silhouetteEnabled: false
      })
      return
    }

    this.setData({
      silhouetteEnabled: true,
      faceOutlineEnabled: false,
      showGuide: false
    }, () => {
      if (!this.data.silhouetteImage && !this.data.silhouetteLoading) {
        this.processSilhouette().catch(() => {})
      }
    })
  },

  processFaceOutline() {
    if (!this.data.beforeImage) {
      wx.showToast({
        title: '请先导入Before照片',
        icon: 'none'
      })
      this.setData({
        faceOutlineEnabled: false
      })
      return
    }

    this.setData({
      faceOutlineLoading: true
    })

    Promise
      .all([
        this.initFaceDetector(),
        this.getImageInfo(this.data.beforeImage),
        this.getCameraRect()
      ])
      .then(([, imageInfo, cameraRect]) => {
        const maxDetectSize = 480
        const ratio = imageInfo.width / imageInfo.height
        let detectWidth = maxDetectSize
        let detectHeight = Math.round(detectWidth / ratio)

        if (detectHeight > maxDetectSize) {
          detectHeight = maxDetectSize
          detectWidth = Math.round(detectHeight * ratio)
        }

        return this.setFaceCanvasSize(detectWidth, detectHeight)
          .then(() => this.drawImageToFaceCanvas(imageInfo.path, detectWidth, detectHeight))
          .then(() => this.getFaceCanvasImageData(detectWidth, detectHeight))
          .then((imageData) => this.detectFaceFromImageData(imageData, detectWidth, detectHeight))
          .then((faceData) => this.drawFaceOutlineImage(faceData, detectWidth, detectHeight, cameraRect.width, cameraRect.height))
      })
      .then((outlineImage) => {
        this.setData({
          faceOutlineImage: outlineImage,
          faceOutlineLoading: false
        })
      })
      .catch(() => {
        this.setData({
          faceOutlineEnabled: false,
          faceOutlineLoading: false,
          faceOutlineImage: ''
        })
        wx.showToast({
          title: '轮廓生成失败',
          icon: 'none'
        })
      })
  },

  processSilhouette(imagePath, targetRect, showFailToast = true) {
    const beforeImage = imagePath || this.data.beforeImage

    if (!beforeImage) {
      wx.showToast({
        title: '请先导入Before照片',
        icon: 'none'
      })
      this.setData({
        silhouetteEnabled: false
      })
      return Promise.reject(new Error('before image missing'))
    }

    this.setData({
      silhouetteLoading: true
    })

    const rectTask = targetRect ? Promise.resolve(targetRect) : this.getCameraRect().catch(() => this.getPlannedCameraRect())

    return Promise
      .all([
        this.getImageInfo(beforeImage),
        rectTask
      ])
      .then(([imageInfo, cameraRect]) => {
        const drawWidth = Math.max(1, Math.round(cameraRect.width))
        const drawHeight = Math.max(1, Math.round(cameraRect.height))

        return this.setFaceCanvasSize(drawWidth, drawHeight)
          .then(() => this.drawImageToFaceCanvas(imageInfo.path, drawWidth, drawHeight))
          .then(() => this.getFaceCanvasImageData(drawWidth, drawHeight))
          .then((imageData) => this.drawSilhouetteImage(imageData, drawWidth, drawHeight))
      })
      .then((silhouetteImage) => {
        this.setData({
          silhouetteImage,
          silhouetteLoading: false
        })
        return silhouetteImage
      })
      .catch(() => {
        this.setData({
          silhouetteEnabled: false,
          silhouetteLoading: false,
          silhouetteImage: ''
        })
        if (showFailToast) {
          wx.showToast({
            title: '轮廓生成失败',
            icon: 'none'
          })
        }
        throw new Error('silhouette failed')
      })
  },

  initFaceDetector() {
    return new Promise((resolve, reject) => {
      if (this.faceDetectInited) {
        resolve()
        return
      }

      if (!wx.initFaceDetect || !wx.faceDetect) {
        reject(new Error('face detect unsupported'))
        return
      }

      wx.initFaceDetect({
        success: () => {
          this.faceDetectInited = true
          resolve()
        },
        fail: reject
      })
    })
  },

  getCameraRect() {
    return new Promise((resolve, reject) => {
      wx.createSelectorQuery()
        .select('.camera-wrap')
        .boundingClientRect()
        .exec((res) => {
          const rect = res && res[0]

          if (!rect || !rect.width || !rect.height) {
            reject(new Error('camera rect unavailable'))
            return
          }

          resolve(rect)
      })
    })
  },

  getPlannedCameraRect() {
    const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync()
    const windowWidth = info.windowWidth || info.screenWidth || 375
    const windowHeight = info.windowHeight || info.screenHeight || 667
    const rpx = windowWidth / 750
    const safeArea = info.safeArea || {}
    const safeTop = safeArea.top || 0
    const safeBottom = safeArea.bottom ? Math.max(0, windowHeight - safeArea.bottom) : 0
    const width = Math.max(1, windowWidth - 68 * rpx)
    const height = Math.max(1, windowHeight - (130 + 188) * rpx - safeTop - safeBottom)

    return {
      width,
      height
    }
  },

  setFaceCanvasSize(width, height) {
    return new Promise((resolve) => {
      this.setData({
        faceCanvasWidth: width,
        faceCanvasHeight: height
      }, () => {
        wx.nextTick(() => setTimeout(resolve, 40))
      })
    })
  },

  drawImageToFaceCanvas(path, width, height) {
    return new Promise((resolve) => {
      const ctx = wx.createCanvasContext('faceCanvas', this)

      ctx.clearRect(0, 0, width, height)
      ctx.drawImage(path, 0, 0, width, height)
      ctx.draw(false, () => resolve())
    })
  },

  normalizeImageForCompare(src) {
    return this.getImageInfo(src).then((imageInfo) => {
      const maxSide = 2600
      const ratio = imageInfo.width / imageInfo.height
      let width = imageInfo.width
      let height = imageInfo.height

      if (Math.max(width, height) > maxSide) {
        if (width >= height) {
          width = maxSide
          height = Math.round(width / ratio)
        } else {
          height = maxSide
          width = Math.round(height * ratio)
        }
      }

      width = Math.max(1, Math.round(width))
      height = Math.max(1, Math.round(height))

      return this.setMergeCanvasSize(width, height).then(() => new Promise((resolve, reject) => {
        const ctx = wx.createCanvasContext('mergeCanvas', this)

        ctx.clearRect(0, 0, width, height)
        ctx.drawImage(imageInfo.path, 0, 0, width, height)
        ctx.draw(false, () => {
          setTimeout(() => {
            wx.canvasToTempFilePath({
              canvasId: 'mergeCanvas',
              x: 0,
              y: 0,
              width,
              height,
              destWidth: width,
              destHeight: height,
              fileType: 'jpg',
              quality: 1,
              success: (res) => resolve(res.tempFilePath),
              fail: reject
            }, this)
          }, 120)
        })
      }))
    })
  },

  getFaceCanvasImageData(width, height) {
    return new Promise((resolve, reject) => {
      wx.canvasGetImageData({
        canvasId: 'faceCanvas',
        x: 0,
        y: 0,
        width,
        height,
        success: resolve,
        fail: reject
      }, this)
    })
  },

  drawSilhouetteImage(imageData, width, height) {
    return new Promise((resolve, reject) => {
      const source = imageData.data
      const total = width * height
      const gray = new Uint8Array(total)

      for (let i = 0; i < total; i += 1) {
        const sourceIndex = i * 4

        gray[i] = source[sourceIndex] * 0.299 + source[sourceIndex + 1] * 0.587 + source[sourceIndex + 2] * 0.114
      }

      const blurred = this.blurGrayImage(gray, width, height)
      const threshold = this.getGrayThreshold(blurred)
      const binary = new Uint8Array(total)
      const output = new Uint8ClampedArray(source.length)

      for (let i = 0; i < total; i += 1) {
        binary[i] = blurred[i] > threshold ? 1 : 0
      }

      for (let y = 1; y < height - 1; y += 1) {
        for (let x = 1; x < width - 1; x += 1) {
          const index = y * width + x
          const value = binary[index]
          const isEdge = (
            value !== binary[index - 1] ||
            value !== binary[index + 1] ||
            value !== binary[index - width] ||
            value !== binary[index + width]
          )

          if (!isEdge) {
            continue
          }

          const contrast = Math.max(
            Math.abs(blurred[index] - blurred[index - 1]),
            Math.abs(blurred[index] - blurred[index + 1]),
            Math.abs(blurred[index] - blurred[index - width]),
            Math.abs(blurred[index] - blurred[index + width])
          )

          if (contrast < 4) {
            continue
          }

          this.setSilhouetteEdgePixel(output, width, height, x, y, 255)
          this.setSilhouetteEdgePixel(output, width, height, x - 1, y, 190)
          this.setSilhouetteEdgePixel(output, width, height, x + 1, y, 190)
          this.setSilhouetteEdgePixel(output, width, height, x, y - 1, 190)
          this.setSilhouetteEdgePixel(output, width, height, x, y + 1, 190)
        }
      }

      wx.canvasPutImageData({
        canvasId: 'faceCanvas',
        x: 0,
        y: 0,
        width,
        height,
        data: output,
        success: () => {
          wx.canvasToTempFilePath({
            canvasId: 'faceCanvas',
            x: 0,
            y: 0,
            width,
            height,
            destWidth: width * 2,
            destHeight: height * 2,
            fileType: 'png',
            quality: 1,
            success: (res) => resolve(res.tempFilePath),
            fail: reject
          }, this)
        },
        fail: reject
      }, this)
    })
  },

  blurGrayImage(gray, width, height) {
    const total = width * height
    const horizontal = new Uint8Array(total)
    const output = new Uint8Array(total)
    const radius = 1

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        let sum = 0
        let count = 0

        for (let offset = -radius; offset <= radius; offset += 1) {
          const sampleX = x + offset

          if (sampleX >= 0 && sampleX < width) {
            sum += gray[y * width + sampleX]
            count += 1
          }
        }

        horizontal[y * width + x] = Math.round(sum / count)
      }
    }

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        let sum = 0
        let count = 0

        for (let offset = -radius; offset <= radius; offset += 1) {
          const sampleY = y + offset

          if (sampleY >= 0 && sampleY < height) {
            sum += horizontal[sampleY * width + x]
            count += 1
          }
        }

        output[y * width + x] = Math.round(sum / count)
      }
    }

    return output
  },

  getGrayThreshold(gray) {
    const histogram = new Array(256).fill(0)
    let sum = 0

    for (let i = 0; i < gray.length; i += 1) {
      const value = gray[i]

      histogram[value] += 1
      sum += value
    }

    let backgroundWeight = 0
    let backgroundSum = 0
    let bestVariance = 0
    let threshold = 128
    const total = gray.length

    for (let value = 0; value < 256; value += 1) {
      backgroundWeight += histogram[value]

      if (!backgroundWeight) {
        continue
      }

      const foregroundWeight = total - backgroundWeight

      if (!foregroundWeight) {
        break
      }

      backgroundSum += value * histogram[value]

      const backgroundMean = backgroundSum / backgroundWeight
      const foregroundMean = (sum - backgroundSum) / foregroundWeight
      const variance = backgroundWeight * foregroundWeight * Math.pow(backgroundMean - foregroundMean, 2)

      if (variance > bestVariance) {
        bestVariance = variance
        threshold = value
      }
    }

    return threshold
  },

  setSilhouetteEdgePixel(output, width, height, x, y, alpha) {
    if (x < 0 || x >= width || y < 0 || y >= height) {
      return
    }

    const index = (y * width + x) * 4

    if (output[index + 3] >= alpha) {
      return
    }

    output[index] = 255
    output[index + 1] = 255
    output[index + 2] = 255
    output[index + 3] = alpha
  },

  detectFaceFromImageData(imageData, width, height) {
    return new Promise((resolve, reject) => {
      wx.faceDetect({
        frameBuffer: imageData.data.buffer,
        width,
        height,
        enablePoint: true,
        enableMultiFace: false,
        success: (res) => {
          const faceData = this.extractFaceData(res, width, height)

          if (!faceData) {
            reject(new Error('no face'))
            return
          }

          resolve(faceData)
        },
        fail: reject
      })
    })
  },

  extractFaceData(res, imageWidth, imageHeight) {
    const faceInfo = res.faceInfo && res.faceInfo[0] ? res.faceInfo[0] : {}
    const rawPoints = res.pointArray || faceInfo.pointArray || faceInfo.points || faceInfo.facePoints || []
    const rawRect = res.detectRect || faceInfo.detectRect || faceInfo.rect || faceInfo
    const rect = this.normalizeFaceRect(rawRect)
    const points = this.normalizeFacePoints(rawPoints, imageWidth, imageHeight, rect)

    if (points.length) {
      return {
        points,
        rect
      }
    }

    if (rect) {
      return {
        rect
      }
    }

    return null
  },

  normalizeFaceRect(rect) {
    if (!rect || typeof rect !== 'object') {
      return null
    }

    const x = Number(rect.x !== undefined ? rect.x : rect.left)
    const y = Number(rect.y !== undefined ? rect.y : rect.top)
    const width = Number(rect.width !== undefined ? rect.width : rect.right - rect.left)
    const height = Number(rect.height !== undefined ? rect.height : rect.bottom - rect.top)

    if ([x, y, width, height].some((value) => Number.isNaN(value)) || width <= 0 || height <= 0) {
      return null
    }

    return {
      x,
      y,
      width,
      height
    }
  },

  normalizeFacePoints(rawPoints, imageWidth, imageHeight, rect) {
    if (!Array.isArray(rawPoints)) {
      return []
    }

    const points = []

    if (rawPoints.length && typeof rawPoints[0] === 'number') {
      for (let i = 0; i < rawPoints.length - 1; i += 2) {
        points.push({
          x: Number(rawPoints[i]),
          y: Number(rawPoints[i + 1])
        })
      }
    }

    rawPoints.forEach((point) => {
      if (typeof point === 'number') {
        return
      }

      if (Array.isArray(point) && point.length >= 2) {
        points.push({
          x: Number(point[0]),
          y: Number(point[1])
        })
        return
      }

      if (point && typeof point === 'object') {
        const x = point.x !== undefined ? point.x : point.X
        const y = point.y !== undefined ? point.y : point.Y

        if (x !== undefined && y !== undefined) {
          points.push({
            x: Number(x),
            y: Number(y)
          })
        }
      }
    })

    const validPoints = points.filter((point) => !Number.isNaN(point.x) && !Number.isNaN(point.y))
    const maxX = validPoints.reduce((max, point) => Math.max(max, point.x), 0)
    const maxY = validPoints.reduce((max, point) => Math.max(max, point.y), 0)

    if (imageWidth && imageHeight && maxX <= 1.5 && maxY <= 1.5) {
      return validPoints.map((point) => ({
        x: point.x * imageWidth,
        y: point.y * imageHeight
      }))
    }

    if (rect && maxX <= 100 && maxY <= 100 && (rect.x > maxX || rect.y > maxY || rect.width > maxX * 1.8 || rect.height > maxY * 1.8)) {
      return validPoints.map((point) => ({
        x: rect.x + point.x / 100 * rect.width,
        y: rect.y + point.y / 100 * rect.height
      }))
    }

    return validPoints
  },

  drawFaceOutlineImage(faceData, sourceWidth, sourceHeight, targetWidth, targetHeight) {
    const drawWidth = Math.max(1, Math.round(targetWidth))
    const drawHeight = Math.max(1, Math.round(targetHeight))

    return this.setFaceCanvasSize(drawWidth, drawHeight)
      .then(() => new Promise((resolve, reject) => {
        const ctx = wx.createCanvasContext('faceCanvas', this)
        const scaleX = drawWidth / sourceWidth
        const scaleY = drawHeight / sourceHeight
        const outlinePoints = this.getFaceOutlinePoints(faceData, sourceWidth, sourceHeight)
          .map((point) => ({
            x: point.x * scaleX,
            y: point.y * scaleY
          }))

        if (outlinePoints.length < 3) {
          reject(new Error('no face points'))
          return
        }

        ctx.clearRect(0, 0, drawWidth, drawHeight)
        ctx.setStrokeStyle('rgba(255,255,255,0.72)')
        ctx.setLineWidth(3)
        ctx.setLineCap('round')
        ctx.setLineJoin('round')

        this.drawSmoothClosedPath(ctx, outlinePoints)

        ctx.draw(false, () => {
          wx.canvasToTempFilePath({
            canvasId: 'faceCanvas',
            x: 0,
            y: 0,
            width: drawWidth,
            height: drawHeight,
            destWidth: drawWidth * 2,
            destHeight: drawHeight * 2,
            fileType: 'png',
            quality: 1,
            success: (res) => resolve(res.tempFilePath),
            fail: reject
          }, this)
        })
      }))
  },

  getFaceOutlinePoints(faceData, sourceWidth, sourceHeight) {
    if (faceData.points && faceData.points.length >= 8) {
      return this.getConvexHull(faceData.points)
    }

    return []
  },

  getConvexHull(points) {
    const sorted = points
      .map((point) => ({ x: point.x, y: point.y }))
      .sort((a, b) => (a.x === b.x ? a.y - b.y : a.x - b.x))

    if (sorted.length <= 3) {
      return sorted
    }

    const cross = (origin, a, b) => (
      (a.x - origin.x) * (b.y - origin.y) - (a.y - origin.y) * (b.x - origin.x)
    )
    const lower = []
    const upper = []

    sorted.forEach((point) => {
      while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], point) <= 0) {
        lower.pop()
      }
      lower.push(point)
    })

    for (let i = sorted.length - 1; i >= 0; i -= 1) {
      const point = sorted[i]

      while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], point) <= 0) {
        upper.pop()
      }
      upper.push(point)
    }

    upper.pop()
    lower.pop()

    return lower.concat(upper)
  },

  drawSmoothClosedPath(ctx, points) {
    if (!points.length) {
      return
    }

    if (points.length < 3) {
      ctx.beginPath()
      ctx.moveTo(points[0].x, points[0].y)
      points.slice(1).forEach((point) => ctx.lineTo(point.x, point.y))
      ctx.stroke()
      return
    }

    ctx.beginPath()

    for (let i = 0; i < points.length; i += 1) {
      const current = points[i]
      const next = points[(i + 1) % points.length]
      const midX = (current.x + next.x) / 2
      const midY = (current.y + next.y) / 2

      if (i === 0) {
        ctx.moveTo(midX, midY)
      } else {
        ctx.quadraticCurveTo(current.x, current.y, midX, midY)
      }
    }

    const first = points[0]
    const second = points[1]
    ctx.quadraticCurveTo(first.x, first.y, (first.x + second.x) / 2, (first.y + second.y) / 2)
    ctx.stroke()
  },

  getFaceBounds(faceData, sourceWidth, sourceHeight) {
    if (faceData.rect) {
      return {
        x: faceData.rect.x,
        y: faceData.rect.y,
        width: faceData.rect.width,
        height: faceData.rect.height
      }
    }

    if (faceData.points && faceData.points.length) {
      let minX = sourceWidth
      let minY = sourceHeight
      let maxX = 0
      let maxY = 0

      faceData.points.forEach((point) => {
        minX = Math.min(minX, point.x)
        minY = Math.min(minY, point.y)
        maxX = Math.max(maxX, point.x)
        maxY = Math.max(maxY, point.y)
      })

      return {
        x: minX,
        y: minY,
        width: Math.max(1, maxX - minX),
        height: Math.max(1, maxY - minY)
      }
    }

    return {
      x: faceData.rect.x,
      y: faceData.rect.y,
      width: faceData.rect.width,
      height: faceData.rect.height
    }
  },

  confirmPhoto() {
    if (this.data.status === 'before') {
      const beforeImage = this.data.previewImage

      this.saveImageToAlbum(beforeImage)
        .then(() => {
          wx.showToast({
            title: '照片已保存到相册',
            icon: 'success'
          })
          this.goHome()
        })
        .catch(() => {
          wx.showToast({
            title: '保存失败，请检查相册权限',
            icon: 'none'
          })
        })
      return
    }

    if (this.data.status === 'after') {
      const previewImage = this.data.previewImage

      this.setData({
        isGeneratingCompare: true
      })

      this.normalizeImageForCompare(previewImage)
        .catch(() => previewImage)
        .then((afterImage) => {
          this.setData({
            afterImage,
            previewImage: '',
            compareImage: '',
            status: 'result',
            editLayoutReady: false,
            isGeneratingCompare: false,
            isTakingPhoto: false,
            beforeTransform: this.getDefaultTransform(),
            afterTransform: this.getDefaultTransform()
          }, () => {
            this.setLandscape()
            wx.nextTick(() => {
              this.updateEditImageSize()
              setTimeout(() => this.updateEditImageSize(), 240)
            })
          })
        })
    }
  },

  setLandscape() {
    if (!wx.setPageOrientation) {
      return
    }

    try {
      wx.setPageOrientation({
        orientation: 'landscape',
        fail: () => {}
      })
    } catch (error) {}
  },

  setPortrait() {
    if (!wx.setPageOrientation) {
      return
    }

    try {
      wx.setPageOrientation({
        orientation: 'portrait',
        fail: () => {}
      })
    } catch (error) {}
  },

  retakePhoto() {
    this.setData({
      previewImage: '',
      isTakingPhoto: false
    })
  },

  retakeAfterFromResult() {
    this.setPortrait()
    this.ensureCameraPermission()
      .then(() => {
        this.setData({
          status: 'after',
          previewImage: '',
          afterImage: '',
          compareImage: '',
          editLayoutReady: false,
          isGeneratingCompare: false,
          isTakingPhoto: false,
          afterTransform: this.getDefaultTransform()
        }, () => {
          wx.nextTick(() => {
            this.updateCameraMetrics()
            setTimeout(() => this.updateCameraMetrics(), 200)
          })
        })
      })
      .catch(() => {})
  },

  updateEditImageSize() {
    return new Promise((resolve) => {
      if (!this.data.beforeImage || !this.data.afterImage) {
        resolve(false)
        return
      }

      const query = wx.createSelectorQuery()

      query
        .select('.edit-stage')
        .boundingClientRect()
        .exec((res) => {
          const stageRect = res[0]

          if (!stageRect || !stageRect.width || !stageRect.height) {
            resolve(false)
            return
          }

          Promise
            .all([
              this.getImageInfo(this.data.beforeImage),
              this.getImageInfo(this.data.afterImage)
            ])
            .then(([beforeInfo, afterInfo]) => {
              const maxBoxWidth = Math.max(120, (stageRect.width - 22) / 2)
              const maxBoxHeight = Math.max(120, stageRect.height - 58)
              const beforeSize = this.getFittedEditSize(beforeInfo.width / beforeInfo.height, maxBoxWidth, maxBoxHeight)
              const afterSize = this.getFittedEditSize(afterInfo.width / afterInfo.height, maxBoxWidth, maxBoxHeight)

              this.setData({
                beforeEditWidth: beforeSize.width,
                beforeEditHeight: beforeSize.height,
                afterEditWidth: afterSize.width,
                afterEditHeight: afterSize.height,
                editLayoutReady: true
              }, () => resolve(true))
            })
            .catch(() => resolve(false))
        })
    })
  },

  getFittedEditSize(ratio, maxWidth, maxHeight) {
    let width = maxWidth
    let height = width / ratio

    if (height > maxHeight) {
      height = maxHeight
      width = height * ratio
    }

    return {
      width: Math.floor(width),
      height: Math.floor(height)
    }
  },

  getDefaultTransform() {
    return {
      x: 0,
      y: 0,
      scale: 1
    }
  },

  resetImageTransform(e) {
    const target = e.currentTarget.dataset.target

    this.setImageTransform(target, this.getDefaultTransform())
  },

  onImageTouchStart(e) {
    const target = e.currentTarget.dataset.target
    const touches = e.touches
    const transform = this.data[`${target}Transform`]

    this.gestureState = {
      target,
      startTransform: {
        x: transform.x,
        y: transform.y,
        scale: transform.scale
      },
      startX: touches[0].clientX,
      startY: touches[0].clientY,
      startDistance: touches.length > 1 ? this.getTouchDistance(touches) : 0
    }
  },

  onImageTouchMove(e) {
    if (!this.gestureState) {
      return
    }

    const touches = e.touches
    const state = this.gestureState
    const transform = {
      x: state.startTransform.x,
      y: state.startTransform.y,
      scale: state.startTransform.scale
    }

    if (touches.length > 1 && state.startDistance) {
      const distance = this.getTouchDistance(touches)
      transform.scale = Math.max(0.35, Math.min(5, state.startTransform.scale * distance / state.startDistance))
    } else {
      transform.x = state.startTransform.x + touches[0].clientX - state.startX
      transform.y = state.startTransform.y + touches[0].clientY - state.startY
    }

    this.setImageTransform(state.target, transform)
  },

  onImageTouchEnd() {
    this.gestureState = null
  },

  getTouchDistance(touches) {
    const dx = touches[0].clientX - touches[1].clientX
    const dy = touches[0].clientY - touches[1].clientY

    return Math.sqrt(dx * dx + dy * dy)
  },

  setImageTransform(target, transform) {
    if (target !== 'before' && target !== 'after') {
      return
    }

    this.setData({
      [`${target}Transform`]: transform,
      compareImage: ''
    })
  },

  openLabelEditor(e) {
    const target = e.currentTarget.dataset.target

    if (target !== 'before' && target !== 'after') {
      return
    }

    this.setData({
      editingLabelTarget: target,
      editingLabelValue: target === 'before' ? this.data.beforeLabel : this.data.afterLabel
    })
  },

  onLabelInput(e) {
    this.setData({
      editingLabelValue: e.detail.value || ''
    })
  },

  cancelLabelEditor() {
    this.setData({
      editingLabelTarget: '',
      editingLabelValue: ''
    })
  },

  confirmLabelEditor() {
    const target = this.data.editingLabelTarget
    const value = this.data.editingLabelValue.trim()

    if (!value) {
      wx.showToast({
        title: '请输入文字',
        icon: 'none'
      })
      return
    }

    if (value.length > 8) {
      wx.showToast({
        title: '最多8个字',
        icon: 'none'
      })
      return
    }

    this.setData({
      [`${target}Label`]: value,
      editingLabelTarget: '',
      editingLabelValue: '',
      compareImage: ''
    })
  },

  returnToAdjust() {
    this.setData({
      status: 'result',
      compareImage: '',
      editLayoutReady: false
    }, () => {
      this.setLandscape()
      wx.nextTick(() => {
        this.updateEditImageSize()
        setTimeout(() => this.updateEditImageSize(), 180)
      })
    })
  },

  generateCompareImage() {
    if (this.data.isGeneratingCompare) {
      return
    }

    if (!this.data.beforeImage || !this.data.afterImage) {
      wx.showToast({
        title: '请先完成拍摄',
        icon: 'none'
      })
      return
    }

    this.setData({
      isGeneratingCompare: true,
      compareTextAlign: 'center',
      textAlignButtonText: '文字靠左',
      mosaicEnabled: false,
      mosaicBlocks: [],
      mosaicViews: []
    })

    this.prepareCompareLayout()
      .then((ready) => {
        if (!ready) {
          throw new Error('layout not ready')
        }

        return this.renderCompareImage(false)
      })
      .then((compareImage) => {
        this.setData({
          compareImage,
          status: 'merged',
          isGeneratingCompare: false
        }, () => {
          wx.nextTick(() => {
            this.updateMosaicViews()
            setTimeout(() => this.updateMosaicViews(), 180)
          })
        })
        wx.showToast({
          title: '拼接图已生成',
          icon: 'success'
        })
      })
      .catch(() => {
        this.setData({
          isGeneratingCompare: false
        })
        wx.showToast({
          title: '生成失败，请再试一次',
          icon: 'none'
        })
      })
  },

  renderCompareImage(includeMosaic) {
    return Promise
      .all([
        this.getImageInfo(this.data.beforeImage),
        this.getImageInfo(this.data.afterImage)
      ])
      .then(([beforeInfo, afterInfo]) => {
        const targetHeight = Math.min(3600, beforeInfo.height, afterInfo.height)
        const beforeRatio = this.data.beforeEditWidth / this.data.beforeEditHeight || beforeInfo.width / beforeInfo.height
        const afterRatio = this.data.afterEditWidth / this.data.afterEditHeight || afterInfo.width / afterInfo.height
        const beforeWidth = Math.round(targetHeight * beforeRatio)
        const afterWidth = Math.round(targetHeight * afterRatio)
        const labelBarHeight = Math.max(140, Math.round(targetHeight * 0.08))
        const canvasWidth = beforeWidth + afterWidth
        const canvasHeight = targetHeight + labelBarHeight

        return this.setMergeCanvasSize(canvasWidth, canvasHeight).then(() => new Promise((resolve, reject) => {
          const ctx = wx.createCanvasContext('mergeCanvas', this)

          ctx.setFillStyle('#f7f3fb')
          ctx.fillRect(0, 0, canvasWidth, canvasHeight)
          this.drawTransformedImage(
            ctx,
            beforeInfo.path,
            beforeInfo.width,
            beforeInfo.height,
            0,
            0,
            beforeWidth,
            targetHeight,
            this.data.beforeTransform,
            this.data.beforeEditWidth,
            this.data.beforeEditHeight
          )
          this.drawTransformedImage(
            ctx,
            afterInfo.path,
            afterInfo.width,
            afterInfo.height,
            beforeWidth,
            0,
            afterWidth,
            targetHeight,
            this.data.afterTransform,
            this.data.afterEditWidth,
            this.data.afterEditHeight
          )
          this.drawCompareLabels(ctx, beforeWidth, afterWidth, targetHeight, labelBarHeight)

          ctx.draw(false, () => {
            setTimeout(() => {
              const exportImage = () => this.exportMergeCanvas(canvasWidth, canvasHeight).then(resolve).catch(reject)

              if (includeMosaic) {
                this.applyMosaicToMergeCanvas(canvasWidth, canvasHeight).then(exportImage).catch(reject)
                return
              }

              exportImage()
            }, 160)
          })
        }))
      })
  },

  prepareCompareLayout() {
    const getSnapshot = () => ({
      beforeWidth: this.data.beforeEditWidth,
      beforeHeight: this.data.beforeEditHeight,
      afterWidth: this.data.afterEditWidth,
      afterHeight: this.data.afterEditHeight
    })
    const isStable = (previous, current) => (
      Math.abs(previous.beforeWidth - current.beforeWidth) <= 1 &&
      Math.abs(previous.beforeHeight - current.beforeHeight) <= 1 &&
      Math.abs(previous.afterWidth - current.afterWidth) <= 1 &&
      Math.abs(previous.afterHeight - current.afterHeight) <= 1
    )
    const retry = (count) => this.updateEditImageSize().then((ready) => {
      if (!ready) {
        if (count >= 8) {
          return false
        }

        return this.wait(140).then(() => retry(count + 1))
      }

      const previous = getSnapshot()

      return this.wait(140)
        .then(() => this.updateEditImageSize())
        .then((nextReady) => {
          if (!nextReady) {
            return count >= 8 ? false : this.wait(140).then(() => retry(count + 1))
          }

          const current = getSnapshot()

          if (isStable(previous, current) || count >= 8) {
            return true
          }

          return retry(count + 1)
        })
    })

    return this.wait(80).then(() => retry(0))
  },

  wait(duration) {
    return new Promise((resolve) => {
      setTimeout(resolve, duration)
    })
  },

  setMergeCanvasSize(width, height) {
    return new Promise((resolve) => {
      this.setData({
        mergeCanvasWidth: width,
        mergeCanvasHeight: height
      }, () => {
        wx.nextTick(() => {
          setTimeout(resolve, 240)
        })
      })
    })
  },

  drawTransformedImage(ctx, path, imageWidth, imageHeight, x, y, width, height, transform, viewWidth, viewHeight) {
    const imageRatio = imageWidth / imageHeight
    const boxRatio = width / height
    let drawWidth = width
    let drawHeight = height

    if (imageRatio > boxRatio) {
      drawWidth = height * imageRatio
    } else {
      drawHeight = width / imageRatio
    }

    const screenWidth = viewWidth || width
    const screenHeight = viewHeight || height
    const offsetX = (transform.x || 0) * width / screenWidth
    const offsetY = (transform.y || 0) * height / screenHeight
    const scale = transform.scale || 1

    ctx.save()
    ctx.beginPath()
    ctx.rect(x, y, width, height)
    ctx.clip()
    ctx.translate(x + width / 2 + offsetX, y + height / 2 + offsetY)
    ctx.scale(scale, scale)
    ctx.drawImage(path, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight)
    ctx.restore()
  },

  drawCompareLabels(ctx, beforeWidth, afterWidth, y, height) {
    const fontSize = Math.max(52, Math.round(height * 0.36))
    const baselineY = y + height / 2
    const align = this.data.compareTextAlign || 'center'
    const padding = Math.max(56, Math.round(height * 0.48))
    let beforeX = beforeWidth / 2
    let afterX = beforeWidth + afterWidth / 2

    ctx.setFillStyle('#f7f3fb')
    ctx.fillRect(0, y, beforeWidth + afterWidth, height)
    ctx.setFillStyle('#25295a')
    ctx.setFontSize(fontSize)
    ctx.setTextAlign(align)
    ctx.setTextBaseline('middle')

    if (align === 'left') {
      beforeX = padding
      afterX = beforeWidth + padding
    } else if (align === 'right') {
      beforeX = beforeWidth - padding
      afterX = beforeWidth + afterWidth - padding
    }

    ctx.fillText(this.data.beforeLabel || 'Before', beforeX, baselineY)
    ctx.fillText(this.data.afterLabel || 'After', afterX, baselineY)
  },

  exportMergeCanvas(canvasWidth, canvasHeight) {
    return new Promise((resolve, reject) => {
      wx.canvasToTempFilePath({
        canvasId: 'mergeCanvas',
        x: 0,
        y: 0,
        width: canvasWidth,
        height: canvasHeight,
        destWidth: canvasWidth,
        destHeight: canvasHeight,
        fileType: 'png',
        quality: 1,
        success: (res) => resolve(res.tempFilePath),
        fail: reject
      }, this)
    })
  },

  applyMosaicToMergeCanvas(canvasWidth, canvasHeight) {
    const blocks = this.data.mosaicBlocks || []
    const baseSize = Math.max(36, Math.round(Math.min(canvasWidth, canvasHeight) * 0.045))

    let task = Promise.resolve()

    blocks.forEach((block) => {
      const size = Math.round(baseSize * (block.sizeRatio || 1))
      const left = Math.max(0, Math.round(block.x * canvasWidth - size / 2))
      const top = Math.max(0, Math.round(block.y * canvasHeight - size / 2))
      const width = Math.min(size, canvasWidth - left)
      const height = Math.min(size, canvasHeight - top)

      if (width <= 0 || height <= 0) {
        return
      }

      task = task.then(() => this.pixelateMergeCanvasRect(left, top, width, height))
    })

    return task
  },

  pixelateMergeCanvasRect(x, y, width, height) {
    return new Promise((resolve, reject) => {
      wx.canvasGetImageData({
        canvasId: 'mergeCanvas',
        x,
        y,
        width,
        height,
        success: (res) => {
          const data = res.data
          const cellSize = Math.max(8, Math.round(Math.min(width, height) / 5))

          for (let cellY = 0; cellY < height; cellY += cellSize) {
            for (let cellX = 0; cellX < width; cellX += cellSize) {
              const cellWidth = Math.min(cellSize, width - cellX)
              const cellHeight = Math.min(cellSize, height - cellY)
              let red = 0
              let green = 0
              let blue = 0
              let alpha = 0
              let count = 0

              for (let offsetY = 0; offsetY < cellHeight; offsetY += 1) {
                for (let offsetX = 0; offsetX < cellWidth; offsetX += 1) {
                  const index = ((cellY + offsetY) * width + cellX + offsetX) * 4

                  red += data[index]
                  green += data[index + 1]
                  blue += data[index + 2]
                  alpha += data[index + 3]
                  count += 1
                }
              }

              red = Math.round(red / count)
              green = Math.round(green / count)
              blue = Math.round(blue / count)
              alpha = Math.round(alpha / count)

              for (let offsetY = 0; offsetY < cellHeight; offsetY += 1) {
                for (let offsetX = 0; offsetX < cellWidth; offsetX += 1) {
                  const index = ((cellY + offsetY) * width + cellX + offsetX) * 4

                  data[index] = red
                  data[index + 1] = green
                  data[index + 2] = blue
                  data[index + 3] = alpha
                }
              }
            }
          }

          wx.canvasPutImageData({
            canvasId: 'mergeCanvas',
            x,
            y,
            width,
            height,
            data,
            success: resolve,
            fail: reject
          }, this)
        },
        fail: reject
      }, this)
    })
  },

  toggleMosaic() {
    if (this.data.mosaicEnabled) {
      this.mosaicLastPoint = null
      this.setData({
        mosaicEnabled: false,
        mosaicBlocks: [],
        mosaicViews: []
      })
      return
    }

    this.setData({
      mosaicEnabled: true
    }, () => {
      wx.nextTick(() => this.updateMosaicViews())
    })
  },

  cycleCompareTextAlign() {
    if (this.data.isGeneratingCompare) {
      return
    }

    const current = this.data.compareTextAlign || 'center'
    let compareTextAlign = 'left'
    let textAlignButtonText = '文字靠右'

    if (current === 'left') {
      compareTextAlign = 'right'
      textAlignButtonText = '文字居中'
    } else if (current === 'right') {
      compareTextAlign = 'center'
      textAlignButtonText = '文字靠左'
    }

    this.setData({
      compareTextAlign,
      textAlignButtonText,
      isGeneratingCompare: true
    })

    this.renderCompareImage(false)
      .then((compareImage) => {
        this.setData({
          compareImage,
          isGeneratingCompare: false
        }, () => {
          wx.nextTick(() => this.updateMosaicViews())
        })
      })
      .catch(() => {
        this.setData({
          isGeneratingCompare: false
        })
        wx.showToast({
          title: '文字位置更新失败',
          icon: 'none'
        })
      })
  },

  onMosaicTouchStart(e) {
    if (!this.data.mosaicEnabled || !e.touches.length) {
      return
    }

    this.mosaicLastPoint = null
    this.updateMergedDisplayRect().then(() => {
      this.addMosaicPoint(e.touches[0])
    })
  },

  onMosaicTouchMove(e) {
    if (!this.data.mosaicEnabled || !e.touches.length) {
      return
    }

    this.addMosaicPoint(e.touches[0])
  },

  onMosaicTouchEnd() {
    this.mosaicLastPoint = null
  },

  addMosaicPoint(touch) {
    const rect = this.mergedDisplayRect

    if (!rect || !rect.width || !rect.height) {
      return
    }

    const x = (touch.clientX - rect.left) / rect.width
    const y = (touch.clientY - rect.top) / rect.height

    if (x < 0 || x > 1 || y < 0 || y > 1) {
      return
    }

    if (this.mosaicLastPoint) {
      const dx = x - this.mosaicLastPoint.x
      const dy = y - this.mosaicLastPoint.y

      if (Math.sqrt(dx * dx + dy * dy) < 0.018) {
        return
      }
    }

    const mosaicBlocks = this.data.mosaicBlocks.concat({
      id: Date.now() + '-' + this.data.mosaicBlocks.length,
      x,
      y,
      sizeRatio: 1
    })

    this.mosaicLastPoint = { x, y }
    this.setData({
      mosaicBlocks
    }, () => this.updateMosaicViews())
  },

  updateMergedDisplayRect() {
    if (!this.data.compareImage) {
      return Promise.resolve(null)
    }

    return Promise
      .all([
        this.getImageInfo(this.data.compareImage),
        new Promise((resolve, reject) => {
          wx.createSelectorQuery()
            .select('.merged-preview-stage')
            .boundingClientRect()
            .exec((res) => {
              const rect = res && res[0]

              if (!rect || !rect.width || !rect.height) {
                reject(new Error('merged preview unavailable'))
                return
              }

              resolve(rect)
            })
        })
      ])
      .then(([imageInfo, stageRect]) => {
        const imageRatio = imageInfo.width / imageInfo.height
        const stageRatio = stageRect.width / stageRect.height
        let width = stageRect.width
        let height = stageRect.height
        let left = stageRect.left
        let top = stageRect.top

        if (stageRatio > imageRatio) {
          height = stageRect.height
          width = height * imageRatio
          left = stageRect.left + (stageRect.width - width) / 2
        } else {
          width = stageRect.width
          height = width / imageRatio
          top = stageRect.top + (stageRect.height - height) / 2
        }

        this.mergedDisplayRect = {
          left,
          top,
          width,
          height,
          stageLeft: stageRect.left,
          stageTop: stageRect.top
        }

        return this.mergedDisplayRect
      })
      .catch(() => null)
  },

  updateMosaicViews() {
    return this.updateMergedDisplayRect().then((rect) => {
      if (!rect) {
        return
      }

      const size = Math.max(18, Math.round(Math.min(rect.width, rect.height) * 0.045))
      const mosaicViews = (this.data.mosaicBlocks || []).map((block) => ({
        id: block.id,
        left: Math.round(rect.left - rect.stageLeft + block.x * rect.width - size / 2),
        top: Math.round(rect.top - rect.stageTop + block.y * rect.height - size / 2),
        size
      }))

      this.setData({
        mosaicViews
      })
    })
  },

  saveResult() {
    if (!this.data.compareImage) {
      wx.showToast({
        title: '请先生成拼接图',
        icon: 'none'
      })
      return
    }

    if (this.data.isGeneratingCompare) {
      return
    }

    this.setData({
      isGeneratingCompare: true
    })

    this.renderCompareImage(true)
      .then((exportImage) => this.saveImageToAlbum(exportImage))
      .then(() => {
        this.setData({
          isGeneratingCompare: false
        })
        wx.showToast({
          title: '图片已保存到相册',
          icon: 'success'
        })
        this.goHome()
      })
      .catch(() => {
        this.setData({
          isGeneratingCompare: false
        })
        wx.showToast({
          title: '保存失败，请检查相册权限',
          icon: 'none'
        })
      })
  },

  getImageInfo(src) {
    return new Promise((resolve, reject) => {
      wx.getImageInfo({
        src,
        success: resolve,
        fail: reject
      })
    })
  },

  saveImagesToAlbum(filePaths) {
    let task = Promise.resolve()

    filePaths.forEach((filePath) => {
      task = task.then(() => this.saveImageToAlbum(filePath))
    })

    return task
  },

  saveImageToAlbum(filePath) {
    return new Promise((resolve, reject) => {
      wx.saveImageToPhotosAlbum({
        filePath,
        success: resolve,
        fail: reject
      })
    })
  },

  onCameraError(e) {
    this.showCameraPermissionModal().catch(() => {
      wx.showToast({
        title: '请允许使用摄像头',
        icon: 'none'
      })
    })

    console.error('Camera error:', e.detail)
  }
})
