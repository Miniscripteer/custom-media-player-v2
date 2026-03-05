// Custom Media Player - Mini's Windows Media Player Remake
let sound = null;
let tracks = [];
let currentIndex = 0;
let isPlaying = false;

// DOM elements
const els = {
  uploadTracks: document.getElementById('upload-tracks'),
  uploadPfp: document.getElementById('upload-pfp'),
  trackList: document.getElementById('track-list'),
  trackTitle: document.getElementById('track-title'),
  artistPfp: document.getElementById('artist-pfp'),
  playPause: document.getElementById('play-pause'),
  prev: document.getElementById('prev'),
  next: document.getElementById('next'),
  volume: document.getElementById('volume'),
  progress: document.getElementById('progress'),
  themeToggle: document.getElementById('theme-toggle'),
  gradStart: document.getElementById('grad-start'),
  gradEnd: document.getElementById('grad-end'),
  applyGradient: document.getElementById('apply-gradient')
};

// Load saved theme
const savedTheme = localStorage.getItem('theme') || 'light';
document.body.className = savedTheme;
if (savedTheme === 'gradient') {
  document.body.style.setProperty('--grad-start', localStorage.getItem('gradStart') || '#ff7e5f');
  document.body.style.setProperty('--grad-end', localStorage.getItem('gradEnd') || '#feb47b');
}

// Upload audio tracks
els.uploadTracks.addEventListener('change', e => {
  tracks = Array.from(e.target.files);
  updateLibrary();
  if (tracks.length > 0) playTrack(0);
});

// Upload artist picture
els.uploadPfp.addEventListener('change', e => {
  const file = e.target.files[0];
  if (file) {
    els.artistPfp.src = URL.createObjectURL(file);
  }
});

function updateLibrary() {
  els.trackList.innerHTML = '';
  tracks.forEach((file, i) => {
    const li = document.createElement('li');
    li.textContent = file.name;
    li.onclick = () => playTrack(i);
    if (i === currentIndex) li.classList.add('active');
    els.trackList.appendChild(li);
  });
}

function playTrack(index) {
  if (sound) {
    sound.unload();
  }
  currentIndex = index;
  const file = tracks[index];
  const src = URL.createObjectURL(file);

  sound = new Howl({
    src: [src],
    html5: true,
    volume: els.volume.value,
    onloaderror: (id, err) => console.error('Howl load error:', err),
    onplay: () => {
      isPlaying = true;
      els.playPause.textContent = '⏸ Pause';
      updateLibrary();
    },
    onpause: () => {
      isPlaying = false;
      els.playPause.textContent = '▶️ Play';
    },
    onend: () => nextTrack(),
  });

  sound.play();
  els.trackTitle.textContent = file.name;

  // Update progress bar
  const durationMs = sound.duration() * 1000;
  const interval = setInterval(() => {
    if (!isPlaying || !sound) {
      clearInterval(interval);
      return;
    }
    const pos = sound.seek() * 1000;
    els.progress.value = (pos / durationMs) * 100 || 0;
  }, 300);
}

function nextTrack() {
  let next = currentIndex + 1;
  if (next >= tracks.length) next = 0;
  playTrack(next);
}

function prevTrack() {
  let prev = currentIndex - 1;
  if (prev < 0) prev = tracks.length - 1;
  playTrack(prev);
}

// Controls
els.playPause.onclick = () => {
  if (!sound) return;
  isPlaying ? sound.pause() : sound.play();
};

els.prev.onclick = prevTrack;
els.next.onclick = nextTrack;

els.volume.oninput = e => {
  if (sound) sound.volume(e.target.value);
};

// Theme toggle
els.themeToggle.onclick = () => {
  let current = document.body.className;
  let next = current === 'light' ? 'dark' : 'light';
  document.body.className = next;
  localStorage.setItem('theme', next);
};

// Gradient theme
els.applyGradient.onclick = () => {
  const start = els.gradStart.value;
  const end = els.gradEnd.value;
  document.body.style.setProperty('--grad-start', start);
  document.body.style.setProperty('--grad-end', end);
  document.body.className = 'gradient';
  localStorage.setItem('theme', 'gradient');
  localStorage.setItem('gradStart', start);
  localStorage.setItem('gradEnd', end);
};
