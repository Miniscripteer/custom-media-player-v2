let sound = null
let tracks = []
let currentIndex = 0
let isPlaying = false
let playlists = JSON.parse(localStorage.getItem('playlists')) || {}
let artistPfps = JSON.parse(localStorage.getItem('artistPfps')) || {}
let albumCovers = JSON.parse(localStorage.getItem('albumCovers')) || {}
let currentQueue = []
let audioCtx = null
let analyser = null
let visualizationInterval = null
let shuffle = false
let repeat = false
let playbackSpeed = 1
let autoPlay = false
let crossfade = 0
let vizStyle = 'bars'
let recentTracks = JSON.parse(localStorage.getItem('recentTracks')) || []

const els = {
  uploadTracks: document.getElementById('upload-tracks'),
  uploadFolder: document.getElementById('upload-folder'),
  dropZone: document.getElementById('drop-zone'),
  downloadBtn: document.getElementById('download-track'),
  accentPicker: document.getElementById('accent-color'),
  fontSelector: document.getElementById('font-selector'),
  trackList: document.getElementById('track-list'),
  libraryGroups: document.getElementById('library-groups'),
  trackTitle: document.getElementById('track-title'),
  albumInfo: document.getElementById('album-info'),
  artistPfp: document.getElementById('artist-pfp'),
  playPause: document.getElementById('play-pause'),
  prev: document.getElementById('prev'),
  next: document.getElementById('next'),
  volume: document.getElementById('volume'),
  progress: document.getElementById('progress'),
  themeToggle: document.getElementById('theme-toggle'),
  gradStart: document.getElementById('grad-start'),
  gradEnd: document.getElementById('grad-end'),
  applyGradient: document.getElementById('apply-gradient'),
  shuffle: document.getElementById('shuffle'),
  repeat: document.getElementById('repeat'),
  playbackSpeed: document.getElementById('playback-speed'),
  autoPlay: document.getElementById('auto-play'),
  crossfade: document.getElementById('crossfade'),
  vizStyle: document.getElementById('viz-style'),
  sidePlaylists: document.getElementById('side-playlists'),
  recentTracks: document.getElementById('recent-tracks')
}

function addRecent(index) {
  recentTracks = recentTracks.filter(i => i !== index)
  recentTracks.push(index)
  localStorage.setItem('recentTracks', JSON.stringify(recentTracks))
}

function getNextIndex() {
  if (repeat) return currentIndex

  if (shuffle) {
    let rand
    do {
      rand = Math.floor(Math.random() * tracks.length)
    } while (rand === currentIndex)
    return rand
  }

  if (currentQueue.length > 0) {
    const queueIdx = currentQueue.indexOf(currentIndex)
    if (queueIdx < currentQueue.length - 1) return currentQueue[queueIdx + 1]
  }

  return (currentIndex + 1) % tracks.length
}

function playTrack(index) {
  if (!tracks[index] || !tracks[index].file) return

  if (sound && crossfade > 0) {
    sound.fade(els.volume.value, 0, crossfade * 1000)
    setTimeout(() => sound.unload(), crossfade * 1000)
  } else if (sound) {
    sound.unload()
  }

  currentIndex = index
  const src = URL.createObjectURL(tracks[index].file)

  sound = new Howl({
    src: [src],
    html5: true,
    volume: els.volume.value,
    rate: playbackSpeed,
    onplay: () => {
      isPlaying = true
      els.playPause.textContent = '⏸ Pause'
      addRecent(index)
      updateSidePanel()
      startVisualization()
    },
    onpause: () => {
      isPlaying = false
      els.playPause.textContent = '▶️ Play'
      stopVisualization()
    },
    onend: () => {
      if (autoPlay || repeat || shuffle) {
        playTrack(getNextIndex())
      }
    }
  })

  sound.play()
  els.trackTitle.textContent = tracks[index].title
  els.albumInfo.textContent = `Album: ${tracks[index].album} | Artist: ${tracks[index].artist}`
  els.artistPfp.src = tracks[index].pfp
}

els.playPause.onclick = () => {
  if (!sound) return
  isPlaying ? sound.pause() : sound.play()
}

els.next.onclick = () => playTrack(getNextIndex())
els.prev.onclick = () => playTrack((currentIndex - 1 + tracks.length) % tracks.length)

els.shuffle.onclick = () => {
  shuffle = !shuffle
  els.shuffle.style.opacity = shuffle ? '1' : '0.5'
}

els.repeat.onclick = () => {
  repeat = !repeat
  els.repeat.style.opacity = repeat ? '1' : '0.5'
}

els.playbackSpeed.oninput = e => {
  playbackSpeed = e.target.value
  if (sound) sound.rate(playbackSpeed)
}

els.crossfade.oninput = e => crossfade = e.target.value
els.autoPlay.onchange = e => autoPlay = e.target.checked

els.volume.oninput = e => {
  if (sound) sound.volume(e.target.value)
}

els.downloadBtn.onclick = () => {
  if (!tracks[currentIndex]?.file) return
  const a = document.createElement('a')
  a.href = URL.createObjectURL(tracks[currentIndex].file)
  a.download = tracks[currentIndex].title
  a.click()
}

els.accentPicker?.addEventListener('input', e => {
  document.documentElement.style.setProperty('--accent', e.target.value)
  document.documentElement.style.setProperty('--accent-dark', e.target.value)
})

els.fontSelector?.addEventListener('change', e => {
  document.documentElement.style.setProperty('--font-main', e.target.value)
})

els.dropZone?.addEventListener('dragover', e => {
  e.preventDefault()
  els.dropZone.classList.add('dragover')
})

els.dropZone?.addEventListener('dragleave', () => {
  els.dropZone.classList.remove('dragover')
})

els.dropZone?.addEventListener('drop', e => {
  e.preventDefault()
  els.dropZone.classList.remove('dragover')
  loadFiles(e.dataTransfer.files)
})

function startVisualization() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)()
    analyser = audioCtx.createAnalyser()
    const source = audioCtx.createMediaElementSource(sound._sounds[0]._node)
    source.connect(analyser)
    analyser.connect(audioCtx.destination)
    analyser.fftSize = 256
  }

  const bufferLength = analyser.frequencyBinCount
  const dataArray = new Uint8Array(bufferLength)
  const canvasCtx = document.getElementById('visualization').getContext('2d')
  const WIDTH = 500
  const HEIGHT = 150

  stopVisualization()

  visualizationInterval = setInterval(() => {
    analyser.getByteFrequencyData(dataArray)
    canvasCtx.clearRect(0, 0, WIDTH, HEIGHT)

    if (vizStyle === 'circle') {
      const centerX = WIDTH / 2
      const centerY = HEIGHT / 2
      dataArray.forEach((v, i) => {
        const angle = (i / bufferLength) * Math.PI * 2
        const radius = 50 + v / 2
        canvasCtx.beginPath()
        canvasCtx.arc(
          centerX + Math.cos(angle) * radius,
          centerY + Math.sin(angle) * radius,
          2,
          0,
          Math.PI * 2
        )
        canvasCtx.fillStyle = `hsl(${v * 2}, 100%, 50%)`
        canvasCtx.fill()
      })
    } else {
      const barWidth = (WIDTH / bufferLength) * 2
      let x = 0
      dataArray.forEach(v => {
        const h = v / 2
        canvasCtx.fillStyle = `hsl(${v * 2}, 100%, 50%)`
        canvasCtx.fillRect(x, HEIGHT - h, barWidth, h)
        x += barWidth + 1
      })
    }
  }, 50)
}

function stopVisualization() {
  if (visualizationInterval) clearInterval(visualizationInterval)
}
