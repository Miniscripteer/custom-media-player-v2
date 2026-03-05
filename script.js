let sound = null;
let tracks = [];
let currentIndex = 0;
let isPlaying = false;
let playlists = JSON.parse(localStorage.getItem('playlists')) || {};
let artistPfps = JSON.parse(localStorage.getItem('artistPfps')) || {};
let albumCovers = JSON.parse(localStorage.getItem('albumCovers')) || {};
let currentQueue = [];
let audioCtx = null;
let analyser = null;
let visualizationInterval = null;

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
  progress: document.getElementById('progress'),
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
};

const savedTheme = localStorage.getItem('theme') || 'light';
document.body.className = savedTheme;
if (savedTheme === 'gradient') {
  document.body.style.setProperty('--grad-start', localStorage.getItem('gradStart') || '#ff7e5f');
  document.body.style.setProperty('--grad-end', localStorage.getItem('gradEnd') || '#feb47b');
}

const savedTracks = JSON.parse(localStorage.getItem('tracksMeta')) || [];
tracks = savedTracks.map(meta => ({ ...meta, file: null }));
updateLibrary();

document.body.addEventListener('click', () => {
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  if (sound && !sound.playing()) {
    sound.play().catch(err => console.log('Play resumed:', err));
  }
}, { once: true });

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.tab).classList.add('active');
  });
});

els.uploadTracks.addEventListener('change', e => loadFiles(e.target.files));
els.uploadFolder.addEventListener('change', e => loadFiles(e.target.files, true));

function loadFiles(files, isFolder = false) {
  Array.from(files).forEach(file => {
    jsmediatags.read(file, {
      onSuccess: tag => {
        const existing = tracks.find(t => t.title === tag.tags.title && t.artist === tag.tags.artist);
        const metadata = {
          file: file || existing?.file,
          title: tag.tags.title || file.name.replace(/\.\w+$/, ''),
          artist: tag.tags.artist || 'Unknown Artist',
          album: tag.tags.album || (isFolder ? 'CD/Album Upload' : 'Single'),
          genre: tag.tags.genre || 'Unknown',
          year: tag.tags.year || 'Unknown',
          type: 'Single',
          pfp: artistPfps[tag.tags.artist] || 'https://via.placeholder.com/150?text=Artist',
          cover: albumCovers[tag.tags.album] || 'https://via.placeholder.com/200?text=Cover',
        };
        if (existing) {
          existing.file = file;
        } else {
          tracks.push(metadata);
        }
        updateLibrary();
        saveData();
      },
      onError: err => {
        console.error('Metadata error', err);
        const metadata = {
          file,
          title: file.name.replace(/\.\w+$/, ''),
          artist: 'Unknown Artist',
          album: isFolder ? 'CD/Album Upload' : 'Single',
          genre: 'Unknown',
          year: 'Unknown',
          type: 'Single',
          pfp: 'https://via.placeholder.com/150?text=Artist',
          cover: 'https://via.placeholder.com/200?text=Cover',
        };
        tracks.push(metadata);
        updateLibrary();
        saveData();
      },
    });
  });
  if (tracks.length > 0 && !sound) playTrack(0);
}

function updateLibrary() {
  els.trackList.innerHTML = '';
  els.libraryGroups.innerHTML = '';

  const groups = tracks.reduce((acc, track, i) => {
    if (!acc[track.album]) acc[track.album] = { tracks: [], artist: track.artist, genre: track.genre, year: track.year, cover: track.cover };
    acc[track.album].tracks.push({ name: track.title, index: i });
    return acc;
  }, {});

  Object.entries(groups).forEach(([album, group]) => {
    const count = group.tracks.length;
    group.type = count > 4 ? 'Album' : (count > 1 ? 'EP' : 'Single');
    group.tracks.forEach(t => tracks[t.index].type = group.type);

    const card = document.createElement('div');
    card.className = 'album-card';
    card.innerHTML = `
      <img class="album-cover" src="${group.cover}" alt="${album}">
      <p>${album}<br>by ${group.artist}<br>${group.type}</p>
    `;
    card.onclick = () => showAlbumModal(album, group);
    els.libraryGroups.appendChild(card);
  });

  tracks.forEach((track, i) => {
    const li = document.createElement('li');
    li.textContent = track.title;
    li.onclick = () => playTrack(i);
    if (i === currentIndex) li.classList.add('active');
    els.trackList.appendChild(li);
  });

  updateArtistPfpsUI();
  updatePlaylistsUI();
}

function showAlbumModal(album, group) {
  els.modalTitle.textContent = `${album} (${group.type})`;
  els.modalCover.src = group.cover;
  els.modalTracks.innerHTML = '';
  group.tracks.forEach(t => {
    const li = document.createElement('li');
    li.textContent = t.name;
    li.onclick = () => playTrack(t.index);
    if (t.index === currentIndex) li.classList.add('active');
    els.modalTracks.appendChild(li);
  });

  els.playAlbum.onclick = () => {
    currentQueue = group.tracks.map(t => t.index);
    const firstIndex = currentQueue[0];
    playTrack(firstIndex);
  };

  els.editAlbum.onclick = () => {
    els.editForm.style.display = 'block';
    els.editAlbumName.value = album;
    els.editArtistName.value = group.artist;
    els.editGenre.value = group.genre;
    els.editYear.value = group.year;

    els.editTracksDiv.innerHTML = '';
    group.tracks.forEach((t, idx) => {
      const div = document.createElement('div');
      div.className = 'edit-song';
      div.innerHTML = `<label>Song ${idx + 1}: <input type="text" value="${t.name}" data-idx="${t.index}"></label>`;
      els.editTracksDiv.appendChild(div);
    });

    els.saveEdit.onclick = saveAlbumEdit.bind(null, album, group);
  };

  els.modal.style.display = 'flex';
}

function saveAlbumEdit(oldAlbum, group) {
  const newAlbum = els.editAlbumName.value;
  const newArtist = els.editArtistName.value;
  const newGenre = els.editGenre.value;
  const newYear = els.editYear.value;
  const coverFile = els.editCover.files[0];

  group.tracks.forEach(t => {
    const track = tracks[t.index];
    track.album = newAlbum;
    track.artist = newArtist;
    track.genre = newGenre;
    track.year = newYear;
    const input = els.editTracksDiv.querySelector(`[data-idx="${t.index}"]`);
    if (input) track.title = input.value;
  });

  if (coverFile) {
    const reader = new FileReader();
    reader.onload = e => {
      albumCovers[newAlbum] = e.target.result;
      tracks.forEach(t => { if (t.album === newAlbum) t.cover = e.target.result; });
      saveData();
      updateLibrary();
    };
    reader.readAsDataURL(coverFile);
  }

  els.editForm.style.display = 'none';
  els.modal.style.display = 'none';
  saveData();
  updateLibrary();
}

document.querySelector('.close').onclick = () => {
  els.modal.style.display = 'none';
  els.editForm.style.display = 'none';
};

function playTrack(index) {
  if (sound) sound.unload();
  currentIndex = index;
  const track = tracks[index];
  if (!track.file) {
    alert('Please re-upload the file for this track.');
    return;
  }
  const src = URL.createObjectURL(track.file);

  sound = new Howl({
    src: [src],
    html5: true,
    volume: els.volume.value,
    onloaderror: (id, err) => console.error('Howl load error:', err),
    onplay: () => {
      isPlaying = true;
      els.playPause.textContent = '⏸ Pause';
      updateLibrary();
      startVisualization();
    },
    onpause: () => {
      isPlaying = false;
      els.playPause.textContent = '▶️ Play';
      stopVisualization();
    },
    onend: () => nextTrack(),
  });

  sound.play().catch(err => console.log('Play error:', err));
  els.trackTitle.textContent = track.title;
  els.albumInfo.textContent = `Album: ${track.album} | Artist: ${track.artist} | Genre: ${track.genre} | Year: ${track.year}`;
  els.artistPfp.src = track.pfp;

  if ('mediaSession' in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title,
      artist: track.artist,
      album: track.album,
      artwork: [{ src: track.pfp, sizes: '512x512', type: 'image/png' }]
    });
  }

  const durationMs = sound.duration() * 1000;
  const interval = setInterval(() => {
    if (!isPlaying || !sound) clearInterval(interval);
    const pos = sound.seek() * 1000;
    els.progress.value = (pos / durationMs) * 100 || 0;
  }, 300);
}

function nextTrack() {
  let next = currentIndex + 1;
  if (currentQueue.length > 0) {
    const queueIdx = currentQueue.indexOf(currentIndex) + 1;
    if (queueIdx < currentQueue.length) {
      next = currentQueue[queueIdx];
    } else {
      currentQueue = [];
      next = (currentIndex + 1) % tracks.length;
    }
  } else {
    next = (currentIndex + 1) % tracks.length;
  }
  playTrack(next);
}

function prevTrack() {
  let prev = currentIndex - 1;
  if (currentQueue.length > 0) {
    const queueIdx = currentQueue.indexOf(currentIndex) - 1;
    if (queueIdx >= 0) {
      prev = currentQueue[queueIdx];
    } else {
      prev = (currentIndex - 1 + tracks.length) % tracks.length;
    }
  } else {
    prev = (currentIndex - 1 + tracks.length) % tracks.length;
  }
  playTrack(prev);
}

els.playPause.onclick = () => {
  if (!sound) return;
  isPlaying ? sound.pause() : sound.play().catch(err => console.log('Play error:', err));
};

els.prev.onclick = prevTrack;
els.next.onclick = nextTrack;

els.volume.oninput = e => {
  if (sound) sound.volume(e.target.value);
};

els.themeToggle.onclick = () => {
  let current = document.body.className;
  let next = current === 'light' ? 'dark' : 'light';
  document.body.className = next;
  localStorage.setItem('theme', next);
};

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

function updateArtistPfpsUI() {
  els.artistPfpsDiv.innerHTML = '';
  const uniqueArtists = [...new Set(tracks.map(t => t.artist))];
  uniqueArtists.forEach(artist => {
    const div = document.createElement('div');
    div.className = 'artist-pfp-item';
    div.innerHTML = `
      <label>${artist}: <input type="file" accept="image/*" data-artist="${artist}"></label>
    `;
    div.querySelector('input').addEventListener('change', e => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = ev => {
          const base64 = ev.target.result;
          artistPfps[artist] = base64;
          tracks.forEach(t => { if (t.artist === artist) t.pfp = base64; });
          saveData();
          updateLibrary();
          if (tracks[currentIndex]?.artist === artist) els.artistPfp.src = base64;
        };
        reader.readAsDataURL(file);
      }
    });
    els.artistPfpsDiv.appendChild(div);
  });
}

els.createPlaylist.onclick = () => {
  const name = prompt('Playlist name?');
  if (name && !playlists[name]) {
    playlists[name] = [];
    saveData();
    updatePlaylistsUI();
  }
};

function updatePlaylistsUI() {
  els.playlistsDiv.innerHTML = '';
  Object.entries(playlists).forEach(([name, indices]) => {
    const div = document.createElement('div');
    div.innerHTML = `<h5>${name} <button data-name="${name}">Add Current Track</button> <button data-delete="${name}">Delete</button></h5><ul class="playlist"></ul>`;
    indices.forEach(idx => {
      const li = document.createElement('li');
      li.textContent = tracks[idx]?.title || 'Unknown';
      li.onclick = () => playTrack(idx);
      div.querySelector('ul').appendChild(li);
    });
    div.querySelector(`[data-name="${name}"]`).onclick = () => {
      if (!indices.includes(currentIndex)) {
        indices.push(currentIndex);
        saveData();
        updatePlaylistsUI();
      }
    };
    div.querySelector(`[data-delete="${name}"]`).onclick = () => {
      delete playlists[name];
      saveData();
      updatePlaylistsUI();
    };
    els.playlistsDiv.appendChild(div);
  });
}

els.clearLibrary.onclick = () => {
  tracks = [];
  playlists = {};
  artistPfps = {};
  albumCovers = {};
  saveData();
  updateLibrary();
  if (sound) sound.unload();
  els.trackTitle.textContent = 'No track selected';
  els.albumInfo.textContent = 'Album: N/A';
  els.artistPfp.src = 'https://via.placeholder.com/150?text=Artist';
};

function saveData() {
  const meta = tracks.map(t => ({
    title: t.title,
    artist: t.artist,
    album: t.album,
    genre: t.genre,
    year: t.year,
    type: t.type,
    pfp: t.pfp,
    cover: t.cover,
  }));
  localStorage.setItem('tracksMeta', JSON.stringify(meta));
  localStorage.setItem('playlists', JSON.stringify(playlists));
  localStorage.setItem('artistPfps', JSON.stringify(artistPfps));
  localStorage.setItem('albumCovers', JSON.stringify(albumCovers));
}

function startVisualization() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioCtx.createAnalyser();
    const source = audioCtx.createMediaElementSource(sound._sounds[0]._node);
    source.connect(analyser);
    analyser.connect(audioCtx.destination);
    analyser.fftSize = 256;
  }
  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);
  const canvasCtx = els.visualization.getContext('2d');
  const WIDTH = els.visualization.width;
  const HEIGHT = els.visualization.height;

  stopVisualization(); // Clear old interval
  visualizationInterval = setInterval(() => {
    analyser.getByteFrequencyData(dataArray);
    canvasCtx.fillStyle = 'rgb(0, 0, 0)';
    canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);
    const barWidth = (WIDTH / bufferLength) * 2.5;
    let barHeight;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      barHeight = dataArray[i] / 2;
      canvasCtx.fillStyle = `rgb(${barHeight + 100}, 50, 50)`;
      canvasCtx.fillRect(x, HEIGHT - barHeight / 2, barWidth, barHeight);
      x += barWidth + 1;
    }
  }, 50);
}

function stopVisualization() {
  if (visualizationInterval) clearInterval(visualizationInterval);
  visualizationInterval = null;
}

updateLibrary();
