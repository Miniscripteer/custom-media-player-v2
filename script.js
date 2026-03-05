// === SAFE ELEMENTS ===
const els = {
  uploadTracks: document.getElementById('upload-tracks'),
  uploadFolder: document.getElementById('upload-folder'),
  trackList: document.getElementById('track-list'),
  libraryGroups: document.getElementById('library-groups'),
  trackTitle: document.getElementById('track-title'),
  albumInfo: document.getElementById('album-info'),
  artistPfp: document.getElementById('artist-pfp'),
  playPause: document.getElementById('play-pause'),
  prev: document.getElementById('prev'),
  next: document.getElementById('next'),
  volume: document.getElementById('volume'),
  themeToggle: document.getElementById('theme-toggle'),
  gradStart: document.getElementById('grad-start'),
  gradEnd: document.getElementById('grad-end'),
  applyGradient: document.getElementById('apply-gradient'),
  artistPfpsDiv: document.getElementById('artist-pfps'),
  createPlaylist: document.getElementById('create-playlist'),
  playlistsDiv: document.getElementById('playlists'),
  clearLibrary: document.getElementById('clear-library'),
  modal: document.getElementById('album-modal'),
  modalTitle: document.getElementById('modal-title'),
  modalCover: document.getElementById('modal-cover'),
  playAlbum: document.getElementById('play-album'),
  editAlbum: document.getElementById('edit-album'),
  modalTracks: document.getElementById('modal-tracks'),
  editForm: document.getElementById('edit-form'),
  editAlbumName: document.getElementById('edit-album-name'),
  editArtistName: document.getElementById('edit-artist-name'),
  editGenre: document.getElementById('edit-genre'),
  editYear: document.getElementById('edit-year'),
  editCover: document.getElementById('edit-cover'),
  editTracksDiv: document.getElementById('edit-tracks'),
  saveEdit: document.getElementById('save-edit'),
  visualization: document.getElementById('visualization'),
  shuffle: document.getElementById('shuffle'),
  repeat: document.getElementById('repeat'),
  playbackSpeed: document.getElementById('playback-speed'),
  autoPlay: document.getElementById('auto-play'),
  crossfade: document.getElementById('crossfade'),
  vizStyle: document.getElementById('viz-style'),
  sidePlaylists: document.getElementById('side-playlists'),
  recentTracks: document.getElementById('recent-tracks'),
  downloadBtn: document.getElementById('download-btn')
};

// === TAB LOGIC FIX ===
const tabButtons = document.querySelectorAll('.tab-btn')
const tabContents = document.querySelectorAll('.tab-content')

tabButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    tabButtons.forEach(b => b.classList.remove('active'))
    tabContents.forEach(c => c.classList.remove('active'))

    btn.classList.add('active')
    const target = document.getElementById(btn.dataset.tab)
    if (target) target.classList.add('active')
  })
})

// === SAFE EVENT HANDLERS ===
if (els.repeat) {
  els.repeat.onclick = () => {
    repeat = !repeat
    els.repeat.style.opacity = repeat ? '1' : '0.5'
  }
}

if (els.playbackSpeed) {
  els.playbackSpeed.oninput = e => {
    playbackSpeed = e.target.value
    if (sound) sound.rate(playbackSpeed)
  }
}

if (els.crossfade) {
  els.crossfade.oninput = e => {
    crossfade = e.target.value
  }
}

if (els.autoPlay) {
  els.autoPlay.onchange = e => {
    autoPlay = e.target.checked
  }
}

if (els.volume) {
  els.volume.oninput = e => {
    if (sound) sound.volume(e.target.value)
  }
}

if (els.downloadBtn) {
  els.downloadBtn.onclick = () => {
    if (!tracks[currentIndex]?.file) return
    const a = document.createElement('a')
    a.href = URL.createObjectURL(tracks[currentIndex].file)
    a.download = tracks[currentIndex].title || 'track'
    a.click()
  }
}
