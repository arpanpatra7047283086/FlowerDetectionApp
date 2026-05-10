package com.example.flowerdetection

import android.content.Context
import android.graphics.Bitmap
import android.net.Uri
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.asRequestBody
import java.io.File
import java.io.FileOutputStream

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MaterialTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    FlowerDetectionScreen()
                }
            }
        }
    }
}

@Composable
fun FlowerDetectionScreen() {
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()

    var imageUri by remember { mutableStateOf<Uri?>(null) }
    var imageBitmap by remember { mutableStateOf<Bitmap?>(null) }
    var resultText by remember { mutableStateOf("Upload or capture an image to detect the flower.") }
    var isLoading by remember { mutableStateOf(false) }

    val galleryLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        if (uri != null) {
            imageUri = uri
            imageBitmap = null
            resultText = "Image selected. Ready to detect."
        }
    }

    val cameraLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.TakePicturePreview()
    ) { bitmap: Bitmap? ->
        if (bitmap != null) {
            imageBitmap = bitmap
            imageUri = null
            resultText = "Photo captured. Ready to detect."
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Box(
            modifier = Modifier
                .size(250.dp)
                .padding(bottom = 16.dp),
            contentAlignment = Alignment.Center
        ) {
            if (imageUri != null) {
                AsyncImage(
                    model = imageUri,
                    contentDescription = "Selected Flower",
                    modifier = Modifier.fillMaxSize()
                )
            } else if (imageBitmap != null) {
                Image(
                    bitmap = imageBitmap!!.asImageBitmap(),
                    contentDescription = "Captured Flower",
                    modifier = Modifier.fillMaxSize()
                )
            } else {
                Text("No image selected")
            }
        }

        Row(
            horizontalArrangement = Arrangement.spacedBy(16.dp),
            modifier = Modifier.padding(bottom = 16.dp)
        ) {
            Button(onClick = { galleryLauncher.launch("image/*") }) {
                Text("Gallery")
            }
            Button(onClick = { cameraLauncher.launch() }) {
                Text("Camera")
            }
        }

        Button(
            onClick = {
                if (imageUri == null && imageBitmap == null) {
                    resultText = "Please select an image first!"
                    return@Button
                }

                isLoading = true
                resultText = "Analyzing..."

                coroutineScope.launch {
                    try {
                        val file = withContext(Dispatchers.IO) {
                            if (imageUri != null) {
                                getFileFromUri(context, imageUri!!)
                            } else {
                                getFileFromBitmap(context, imageBitmap!!)
                            }
                        }

                        val requestFile = file.asRequestBody("image/jpeg".toMediaTypeOrNull())
                        val body = MultipartBody.Part.createFormData("image", file.name, requestFile)

                        val response = RetrofitClient.apiService.detectFlower(body)
                        resultText = "Flower: ${response.flowerName}\nDetails: ${response.description}"
                        
                    } catch (e: Exception) {
                        e.printStackTrace()
                        resultText = "Error communicating with server: ${e.localizedMessage}"
                    } finally {
                        isLoading = false
                    }
                }
            },
            enabled = !isLoading && (imageUri != null || imageBitmap != null)
        ) {
            if (isLoading) {
                CircularProgressIndicator(modifier = Modifier.size(24.dp), color = MaterialTheme.colorScheme.onPrimary)
            } else {
                Text("Detect Flower")
            }
        }

        Spacer(modifier = Modifier.height(24.dp))
        Text(text = resultText, style = MaterialTheme.typography.bodyLarge)
    }
}

fun getFileFromUri(context: Context, uri: Uri): File {
    val inputStream = context.contentResolver.openInputStream(uri)
    val tempFile = File.createTempFile("upload_", ".jpg", context.cacheDir)
    tempFile.outputStream().use { outputStream ->
        inputStream?.copyTo(outputStream)
    }
    return tempFile
}

fun getFileFromBitmap(context: Context, bitmap: Bitmap): File {
    val tempFile = File.createTempFile("upload_", ".jpg", context.cacheDir)
    FileOutputStream(tempFile).use { out ->
        bitmap.compress(Bitmap.CompressFormat.JPEG, 100, out) 
    }
    return tempFile
}