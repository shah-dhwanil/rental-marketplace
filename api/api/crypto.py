"""
Encryption helpers using ChaCha20-Poly1305 (AEAD).

Usage:
    from api.crypto import encrypt_bytes, decrypt_bytes

    ciphertext = encrypt_bytes(key_bytes, plaintext)  # bytes
    plaintext  = decrypt_bytes(key_bytes, ciphertext)  # bytes
"""

import json
import os

from cryptography.hazmat.primitives.ciphers.aead import ChaCha20Poly1305

_NONCE_LEN = 12  # ChaCha20-Poly1305 uses a 96-bit nonce


def encrypt_bytes(key: bytes, plaintext: bytes) -> bytes:
    """Encrypt *plaintext* and return ``nonce || ciphertext`` as bytes."""
    nonce = os.urandom(_NONCE_LEN)
    aead = ChaCha20Poly1305(key)
    ciphertext = aead.encrypt(nonce, plaintext, None)
    return nonce + ciphertext


def decrypt_bytes(key: bytes, data: bytes) -> bytes:
    """Decrypt ``nonce || ciphertext`` produced by :func:`encrypt_bytes`."""
    nonce = data[:_NONCE_LEN]
    ciphertext = data[_NONCE_LEN:]
    aead = ChaCha20Poly1305(key)
    return aead.decrypt(nonce, ciphertext, None)


def encrypt_dict(key: bytes, payload: dict) -> bytes:
    """JSON-encode *payload* then encrypt it."""
    return encrypt_bytes(key, json.dumps(payload, separators=(",", ":")).encode())


def decrypt_dict(key: bytes, data: bytes) -> dict:
    """Decrypt and JSON-decode a payload produced by :func:`encrypt_dict`."""
    raw = decrypt_bytes(key, data)
    return json.loads(raw.decode())
