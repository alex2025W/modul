class ReadOnlyDict(dict):
	def __readonly__(self, *args, **kwargs):
			raise RuntimeError("Cannot modify ReadOnlyDict")

	def __updateitem__(self, key, value):
		# optional processing here
		print('--------')
		print(key)
		super(ReadOnlyDict, self).__setitem__(key, value)
		print('--------')

	__setitem__ = __updateitem__

	__delitem__ = __readonly__
	pop = __readonly__
	popitem = __readonly__
	clear = __readonly__
	#update = __readonly__
	#setdefault = __readonly__
	del __readonly__

	def __getitem__(self, key):
		value = dict.__getitem__(self, key)
		return ReadOnlyDict(value) if isinstance(value, dict) else value
	__getattr__ = __getitem__
