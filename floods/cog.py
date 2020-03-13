"""cli"""
import click
import numpy
import rasterio

from rasterio.rio import options
from rasterio.io import MemoryFile
from rio_cogeo.cogeo import cog_translate
from rio_cogeo.profiles import cog_profiles

class NodataParamType(click.ParamType):
  """Nodata type."""
  name = "nodata"
  def convert(self, value, param, ctx):
    """Validate and parse band index."""
    try:
      if value.lower() == "nan":
        return numpy.nan
      elif value.lower() in ["nil", "none", "nada"]:
        return None
      else:
        return float(value)
    except (TypeError, ValueError):
      raise click.ClickException("{} is not a valid nodata value.".format(value))

@click.command()
@options.file_in_arg
@options.file_out_arg
@click.option(
  "--nodata",
  type=NodataParamType(),
  metavar="NUMBER|nan",
  help="Set nodata masking values for input dataset.",
  multiple=True,
)

def main(input, output, nodata):
  """Read tile."""
  with rasterio.open(input) as src_dst:
    profile = src_dst.profile.copy()
    profile["nodata"] = 0
    arr = src_dst.read()
    for n in nodata:
      arr[arr == n] = 0

    with MemoryFile() as memfile:
      with memfile.open(**profile) as mem:
        # Populate the input file with numpy array
        mem.write(arr)
        
        dst_profile = cog_profiles.get("deflate")        
        cog_translate(
          mem,
          output,
          dst_profile,
          in_memory=True,
          quiet=True,
        )

if __name__ == '__main__':
  main()