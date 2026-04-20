import * as ImageManipulator from 'expo-image-manipulator';

export async function compressImage(uri: string): Promise<string> {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 1080 } }],
    { compress: 0.72, format: ImageManipulator.SaveFormat.JPEG }
  );
  return result.uri;
}
