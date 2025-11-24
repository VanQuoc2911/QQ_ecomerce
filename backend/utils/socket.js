let ioInstance = null;

export function initSocket(io) {
  ioInstance = io;
}

export function getIO() {
  return ioInstance;
}
