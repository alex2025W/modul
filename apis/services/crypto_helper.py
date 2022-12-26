from Crypto import Random
from Crypto.Cipher import AES
import base64

BLOCK_SIZE = 16

def pad(data):
  length = 16 - (len(data) % 16)
  return data + chr(length)*length

def unpad(data):
  return data[:-ord(data[-1])]

def encrypt(message, passphrase):
  IV = Random.new().read(BLOCK_SIZE)
  aes = AES.new(passphrase, AES.MODE_CFB, IV, segment_size=128)
  return base64.b64encode(IV + aes.encrypt(pad(message)))

def decrypt(encrypted, passphrase):
  encrypted = base64.b64decode(encrypted)
  IV = encrypted[:BLOCK_SIZE]
  aes = AES.new(passphrase, AES.MODE_CFB, IV, segment_size=128)
  return unpad(aes.decrypt(encrypted[BLOCK_SIZE:]))
