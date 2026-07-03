export default function decorate(block) {
  block.closest('.section')?.remove();
}
