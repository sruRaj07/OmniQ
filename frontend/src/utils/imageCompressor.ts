/**
 * OmniQ mobile app - image compression facade.
 * Author: OmniQ Team
 */
import * as ImageManipulator from "expo-image-manipulator";

export async function compressImage(uri: string): Promise<string> {
  const result = await ImageManipulator.manipulateAsync(uri, [{ resize: { width: 1400 } }], {
    compress: 0.78,
    format: ImageManipulator.SaveFormat.JPEG
  });
  return result.uri;
}
